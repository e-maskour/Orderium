import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrintJobsAgentService } from '../print-jobs.agent.service';
import { PrintJob } from '../entities/print-job.entity';

const AGENT = { id: 'a1', warehouseId: 7 };

function makeService(opts: {
  jobRepo?: Record<string, unknown>;
  printerRepo?: Record<string, unknown>;
  receipt?: Record<string, unknown>;
  pdf?: Record<string, unknown>;
}) {
  const jobRepo = opts.jobRepo ?? {};
  const printerRepo = opts.printerRepo ?? {};
  const svc = new PrintJobsAgentService(
    {
      getRepository: (entity: { name: string }) =>
        entity === PrintJob || entity.name === 'PrintJob' ? jobRepo : printerRepo,
    } as never,
    (opts.receipt ?? {}) as never,
    (opts.pdf ?? {}) as never,
  );
  return { svc, jobRepo, printerRepo };
}

describe('PrintJobsAgentService.claim', () => {
  it('claims only a queued job, scoped to the agent warehouse', async () => {
    const query = jest.fn().mockResolvedValue([{ id: 'j1', status: 'claimed' }]);
    const { svc } = makeService({ jobRepo: { query } });

    const job = await svc.claim('j1', AGENT);

    expect(job.status).toBe('claimed');
    const [sql, params] = query.mock.calls[0];
    expect(sql).toContain("status = 'queued'");
    expect(sql).toContain('warehouse_id = $3');
    expect(params).toEqual(['a1', 'j1', 7]);
  });

  it('increments attempts as part of the claim', async () => {
    const query = jest.fn().mockResolvedValue([{ id: 'j1' }]);
    const { svc } = makeService({ jobRepo: { query } });
    await svc.claim('j1', AGENT);
    expect(query.mock.calls[0][0]).toContain('attempts = attempts + 1');
  });

  it('throws Conflict when another agent won the race', async () => {
    const { svc } = makeService({ jobRepo: { query: jest.fn().mockResolvedValue([]) } });
    await expect(svc.claim('j1', AGENT)).rejects.toThrow(ConflictException);
  });

  it('tolerates drivers that return [rows, affected]', async () => {
    const query = jest.fn().mockResolvedValue([[{ id: 'j1', status: 'claimed' }], 1]);
    const { svc } = makeService({ jobRepo: { query } });
    await expect(svc.claim('j1', AGENT)).resolves.toMatchObject({ id: 'j1' });
  });
});

describe('PrintJobsAgentService.payload', () => {
  const claimedJob = {
    id: 'j1',
    agentId: 'a1',
    warehouseId: 7,
    printerId: 'p1',
    documentType: 'receipt',
    documentRef: 42,
  };

  it('refuses a job the agent does not hold', async () => {
    const { svc } = makeService({
      jobRepo: { findOne: jest.fn().mockResolvedValue({ ...claimedJob, agentId: 'other' }) },
    });
    await expect(svc.payload('j1', AGENT)).rejects.toThrow(ForbiddenException);
  });

  it('throws when the job does not exist', async () => {
    const { svc } = makeService({ jobRepo: { findOne: jest.fn().mockResolvedValue(null) } });
    await expect(svc.payload('j1', AGENT)).rejects.toThrow(NotFoundException);
  });

  it('renders ESC/POS for a thermal printer and marks the job printing', async () => {
    const update = jest.fn();
    const { svc } = makeService({
      jobRepo: { findOne: jest.fn().mockResolvedValue(claimedJob), update },
      printerRepo: {
        findOne: jest.fn().mockResolvedValue({
          id: 'p1', kind: 'thermal', paperWidth: 80, brand: 'epson',
        }),
      },
      receipt: {
        build: jest.fn().mockResolvedValue({
          storeName: 'S', orderNumber: 'O', date: 'd', clientName: 'c',
          items: [], subtotal: 0, total: 0,
        }),
      },
    });

    const payload = await svc.payload('j1', AGENT);

    expect(payload.kind).toBe('escpos');
    expect(Buffer.from(payload.dataBase64!, 'base64')[0]).toBe(0x1b);
    // Bytes are now considered sent — the job must not be auto-retried.
    expect(update).toHaveBeenCalledWith(
      { id: 'j1' },
      expect.objectContaining({ status: 'printing' }),
    );
  });

  it('returns a PDF for a document printer', async () => {
    const { svc } = makeService({
      jobRepo: {
        findOne: jest.fn().mockResolvedValue({ ...claimedJob, documentType: 'bl' }),
        update: jest.fn(),
      },
      printerRepo: {
        findOne: jest.fn().mockResolvedValue({ id: 'p1', kind: 'document' }),
      },
      pdf: {
        generateDocumentPDF: jest.fn().mockResolvedValue({
          pdfBuffer: Buffer.from('%PDF-1.4'),
          fileName: 'bl.pdf',
        }),
      },
    });

    const payload = await svc.payload('j1', AGENT);
    expect(payload.kind).toBe('pdf');
    expect(Buffer.from(payload.dataBase64!, 'base64').toString()).toBe('%PDF-1.4');
    expect(payload.fileName).toBe('bl.pdf');
  });
});

describe('PrintJobsAgentService.report', () => {
  const job = { id: 'j1', agentId: 'a1', warehouseId: 7 };

  it('marks a successful job done', async () => {
    const save = jest.fn(async (x) => x);
    const { svc } = makeService({
      jobRepo: { findOne: jest.fn().mockResolvedValue({ ...job }), save },
    });
    await svc.report('j1', AGENT, { status: 'done', durationMs: 120 });
    expect(save).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'done', durationMs: 120, completedAt: expect.any(Date) }),
    );
  });

  it('records the device error on failure', async () => {
    const save = jest.fn(async (x) => x);
    const { svc } = makeService({
      jobRepo: { findOne: jest.fn().mockResolvedValue({ ...job }), save },
    });
    await svc.report('j1', AGENT, { status: 'failed', durationMs: 5, error: 'out of paper' });
    expect(save).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'failed', errorMessage: 'out of paper' }),
    );
  });

  it('refuses a report from an agent that does not hold the job', async () => {
    const { svc } = makeService({
      jobRepo: { findOne: jest.fn().mockResolvedValue({ ...job, agentId: 'other' }), save: jest.fn() },
    });
    await expect(
      svc.report('j1', AGENT, { status: 'done', durationMs: 1 }),
    ).rejects.toThrow(ForbiddenException);
  });
});

describe('PrintJobsAgentService.pending', () => {
  it('returns only queued jobs for the agent warehouse, oldest first', async () => {
    const find = jest.fn().mockResolvedValue([]);
    const { svc } = makeService({ jobRepo: { find } });
    await svc.pending(AGENT);
    expect(find).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { warehouseId: 7, status: 'queued' },
        order: { queuedAt: 'ASC' },
      }),
    );
  });
});

describe('PrintJobsAgentService.payload target', () => {
  const claimed = {
    id: 'j1', agentId: 'a1', warehouseId: 7, printerId: 'p1',
    documentType: 'receipt', documentRef: 42,
  };

  it('tells the agent where to send the bytes', async () => {
    const { svc } = makeService({
      jobRepo: { findOne: jest.fn().mockResolvedValue(claimed), update: jest.fn() },
      printerRepo: {
        findOne: jest.fn().mockResolvedValue({
          id: 'p1', kind: 'thermal', paperWidth: 80, brand: 'epson',
          connectionType: 'network', ip: '192.168.1.50', port: 9100, systemName: null,
        }),
      },
      receipt: {
        build: jest.fn().mockResolvedValue({
          storeName: 'S', orderNumber: 'O', date: 'd', clientName: 'c',
          items: [], subtotal: 0, total: 0,
        }),
      },
    });

    const payload = await svc.payload('j1', AGENT);

    expect(payload.target).toEqual({
      printerId: 'p1',
      connectionType: 'network',
      ip: '192.168.1.50',
      port: 9100,
      systemName: null,
      paperWidth: 80,
    });
  });

  it('carries the target on a document payload too', async () => {
    const { svc } = makeService({
      jobRepo: {
        findOne: jest.fn().mockResolvedValue({ ...claimed, documentType: 'bl' }),
        update: jest.fn(),
      },
      printerRepo: {
        findOne: jest.fn().mockResolvedValue({
          id: 'p2', kind: 'document', paperWidth: 148, brand: 'generic',
          connectionType: 'system', ip: null, port: 9100, systemName: 'HP LaserJet',
        }),
      },
      pdf: {
        generateDocumentPDF: jest.fn().mockResolvedValue({
          pdfBuffer: Buffer.from('%PDF'), fileName: 'bl.pdf',
        }),
      },
    });

    const payload = await svc.payload('j1', AGENT);
    expect(payload.target.systemName).toBe('HP LaserJet');
    expect(payload.target.connectionType).toBe('system');
  });
});

describe('PrintJobsAgentService.printers', () => {
  it('lists only the printers of the agent warehouse', async () => {
    const find = jest.fn().mockResolvedValue([]);
    const { svc } = makeService({ printerRepo: { find } });
    await svc.printers(AGENT);
    expect(find).toHaveBeenCalledWith(
      expect.objectContaining({ where: { warehouseId: 7, isEnabled: true } }),
    );
  });

  it('exposes only device fields, never internal ones', async () => {
    const find = jest.fn().mockResolvedValue([
      {
        id: 'p1', warehouseId: 7, isDefault: true, documentTypes: ['receipt'],
        connectionType: 'network', ip: '1.1.1.1', port: 9100,
        systemName: null, paperWidth: 80,
      },
    ]);
    const { svc } = makeService({ printerRepo: { find } });
    const list = await svc.printers(AGENT);

    expect(list).toEqual([
      {
        printerId: 'p1', connectionType: 'network', ip: '1.1.1.1',
        port: 9100, systemName: null, paperWidth: 80,
      },
    ]);
    expect(JSON.stringify(list)).not.toContain('warehouseId');
  });
});

