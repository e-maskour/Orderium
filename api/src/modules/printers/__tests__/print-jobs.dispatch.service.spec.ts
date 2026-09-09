import { BadRequestException, NotFoundException } from '@nestjs/common';
import {
  PrintJobsDispatchService,
  buildIdempotencyKey,
} from '../print-jobs.dispatch.service';
import { PrintJob } from '../entities/print-job.entity';

describe('buildIdempotencyKey', () => {
  it('is stable for the same document and printer', () => {
    expect(buildIdempotencyKey('receipt', 12, 'p1')).toBe(
      buildIdempotencyKey('receipt', 12, 'p1'),
    );
  });

  it('differs per printer, so one document can print in two places', () => {
    expect(buildIdempotencyKey('receipt', 12, 'p1')).not.toBe(
      buildIdempotencyKey('receipt', 12, 'p2'),
    );
  });

  it('differs for an explicit reprint', () => {
    expect(buildIdempotencyKey('receipt', 12, 'p1', 2)).not.toBe(
      buildIdempotencyKey('receipt', 12, 'p1'),
    );
  });
});

const PRINTER = {
  id: 'p1',
  warehouseId: 7,
  isEnabled: true,
  documentTypes: ['receipt'],
};

function makeService(opts: {
  printer?: unknown;
  existingJob?: unknown;
  notify?: jest.Mock;
  save?: jest.Mock;
}) {
  const printerRepo = {
    findOne: jest.fn().mockResolvedValue(opts.printer ?? null),
  };
  const save =
    opts.save ?? jest.fn(async (x) => ({ ...(x as object), id: 'j1' }));
  const jobRepo = {
    findOne: jest.fn().mockResolvedValue(opts.existingJob ?? null),
    create: (x: unknown) => x,
    save,
  };
  const notify = opts.notify ?? jest.fn();
  const svc = new PrintJobsDispatchService(
    {
      getRepository: (entity: { name: string }) =>
        entity === PrintJob || entity.name === 'PrintJob'
          ? jobRepo
          : printerRepo,
    } as never,
    { notify } as never,
  );
  return { svc, printerRepo, jobRepo, notify, save };
}

describe('PrintJobsDispatchService.enqueue', () => {
  it('queues to an explicitly named printer', async () => {
    const { svc, save } = makeService({ printer: PRINTER });
    const { job, created } = await svc.enqueue(
      { documentType: 'receipt', documentRef: 12, printerId: 'p1' },
      1,
    );
    expect(created).toBe(true);
    expect(job.printerId).toBe('p1');
    expect(save).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'queued',
        warehouseId: 7,
        attempts: 0,
      }),
    );
  });

  it('falls back to the warehouse default printer', async () => {
    const { svc, printerRepo } = makeService({ printer: PRINTER });
    await svc.enqueue(
      { documentType: 'receipt', documentRef: 12, warehouseId: 7 },
      1,
    );
    const where = printerRepo.findOne.mock.calls[0][0].where;
    expect(where).toMatchObject({
      warehouseId: 7,
      isEnabled: true,
      isDefault: true,
    });
  });

  it('requires either a printer or a warehouse', async () => {
    const { svc } = makeService({ printer: PRINTER });
    await expect(
      svc.enqueue({ documentType: 'receipt', documentRef: 12 }, 1),
    ).rejects.toThrow(BadRequestException);
  });

  it('throws when no printer handles the document type', async () => {
    const { svc } = makeService({ printer: null });
    await expect(
      svc.enqueue(
        { documentType: 'receipt', documentRef: 12, warehouseId: 7 },
        1,
      ),
    ).rejects.toThrow(NotFoundException);
  });

  it('refuses a printer that is not assigned to a warehouse', async () => {
    const { svc } = makeService({ printer: { ...PRINTER, warehouseId: null } });
    await expect(
      svc.enqueue(
        { documentType: 'receipt', documentRef: 12, printerId: 'p1' },
        1,
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('returns the existing job for a duplicate submission without saving', async () => {
    const existing = { id: 'j1', status: 'queued' };
    const { svc, save } = makeService({
      printer: PRINTER,
      existingJob: existing,
    });
    const res = await svc.enqueue(
      { documentType: 'receipt', documentRef: 12, printerId: 'p1' },
      1,
    );
    expect(res).toEqual({ job: existing, created: false });
    expect(save).not.toHaveBeenCalled();
  });

  it('notifies the warehouse channel after queueing', async () => {
    const notify = jest.fn();
    const { svc } = makeService({ printer: PRINTER, notify });
    await svc.enqueue(
      { documentType: 'receipt', documentRef: 12, printerId: 'p1' },
      1,
    );
    expect(notify).toHaveBeenCalledWith(7, 'j1');
  });

  it('does not notify when the job was a duplicate', async () => {
    const notify = jest.fn();
    const { svc } = makeService({
      printer: PRINTER,
      existingJob: { id: 'j1' },
      notify,
    });
    await svc.enqueue(
      { documentType: 'receipt', documentRef: 12, printerId: 'p1' },
      1,
    );
    expect(notify).not.toHaveBeenCalled();
  });
});
