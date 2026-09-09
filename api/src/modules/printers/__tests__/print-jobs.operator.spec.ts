import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PrintJobsDispatchService } from '../print-jobs.dispatch.service';
import { PrintJob } from '../entities/print-job.entity';

function build(job: unknown) {
  const save = jest.fn(async (x) => x);
  const jobRepo = { findOne: jest.fn().mockResolvedValue(job), save };
  const notify = jest.fn();
  const svc = new PrintJobsDispatchService(
    {
      getRepository: (e: { name: string }) =>
        e === PrintJob || e.name === 'PrintJob' ? jobRepo : {},
    } as never,
    { notify } as never,
  );
  return { svc, save, notify };
}

const failedJob = {
  id: 'j1',
  status: 'failed',
  warehouseId: 7,
  printerId: 'p1',
  documentType: 'receipt',
  documentRef: 42,
  idempotencyKey: 'receipt:42:p1',
};

describe('PrintJobsDispatchService.retry', () => {
  it('requeues a failed job with a fresh idempotency key', async () => {
    const { svc, save, notify } = build(failedJob);
    await svc.retry('j1');
    expect(save).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'queued',
        attempts: 0,
        agentId: null,
        idempotencyKey: 'receipt:42:p1:r1',
      }),
    );
    expect(notify).toHaveBeenCalledWith(7, 'j1');
  });

  it('increments the reprint sequence on a repeated retry', async () => {
    const { svc, save } = build({
      ...failedJob,
      idempotencyKey: 'receipt:42:p1:r1',
    });
    await svc.retry('j1');
    expect(save).toHaveBeenCalledWith(
      expect.objectContaining({ idempotencyKey: 'receipt:42:p1:r2' }),
    );
  });

  it('refuses to retry a job still in flight', async () => {
    const { svc } = build({ ...failedJob, status: 'printing' });
    await expect(svc.retry('j1')).rejects.toThrow(BadRequestException);
  });

  it('throws when the job does not exist', async () => {
    const { svc } = build(null);
    await expect(svc.retry('nope')).rejects.toThrow(NotFoundException);
  });
});

describe('PrintJobsDispatchService.cancel', () => {
  it('cancels a queued job', async () => {
    const { svc, save } = build({ ...failedJob, status: 'queued' });
    await svc.cancel('j1');
    expect(save).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'cancelled',
        completedAt: expect.any(Date),
      }),
    );
  });

  it('refuses to cancel a job whose bytes already reached the device', async () => {
    // Cancelling 'printing' would misreport what physically happened.
    const { svc } = build({ ...failedJob, status: 'printing' });
    await expect(svc.cancel('j1')).rejects.toThrow(BadRequestException);
  });

  it('refuses to cancel an already-completed job', async () => {
    const { svc } = build({ ...failedJob, status: 'done' });
    await expect(svc.cancel('j1')).rejects.toThrow(BadRequestException);
  });
});
