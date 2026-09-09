import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ArrayContains, Repository } from 'typeorm';
import { TenantConnectionService } from '../tenant/tenant-connection.service';
import { PrintJob } from './entities/print-job.entity';
import { Printer } from './entities/printer.entity';
import { PrintNotifier } from './print-notifier.service';
import { CreatePrintJobDto } from './dto/create-print-job.dto';

/**
 * Deterministic by design: repeated clicks on one button collapse into a single
 * job. An explicit Reprint passes a sequence number to opt out.
 */
export function buildIdempotencyKey(
  documentType: string,
  documentRef: number,
  printerId: string,
  reprintSeq?: number,
): string {
  const base = `${documentType}:${documentRef}:${printerId}`;
  return reprintSeq ? `${base}:r${reprintSeq}` : base;
}

/** A printer that can actually receive jobs: warehouse_id is not null. */
type RoutablePrinter = Printer & { warehouseId: number };

@Injectable()
export class PrintJobsDispatchService {
  private readonly logger = new Logger(PrintJobsDispatchService.name);

  constructor(
    private readonly tenantConnService: TenantConnectionService,
    private readonly notifier: PrintNotifier,
  ) {}

  private get jobs(): Repository<PrintJob> {
    return this.tenantConnService.getRepository(PrintJob);
  }

  private get printers(): Repository<Printer> {
    return this.tenantConnService.getRepository(Printer);
  }

  /** Returns a printer guaranteed to be routable — i.e. assigned to a warehouse. */
  private async resolvePrinter(
    dto: CreatePrintJobDto,
  ): Promise<RoutablePrinter> {
    if (!dto.printerId && dto.warehouseId == null) {
      throw new BadRequestException(
        'Either printerId or warehouseId must be supplied',
      );
    }

    const printer = dto.printerId
      ? await this.printers.findOne({
          where: { id: dto.printerId, isEnabled: true },
        })
      : await this.printers.findOne({
          where: {
            warehouseId: dto.warehouseId,
            isEnabled: true,
            isDefault: true,
            documentTypes: ArrayContains([dto.documentType]),
          },
        });

    if (!printer) {
      throw new NotFoundException(
        `No enabled printer available for document type "${dto.documentType}"`,
      );
    }

    // warehouse_id is nullable for tenants that had printers before warehouses
    // existed. Such a printer cannot be routed to, so refuse rather than
    // queueing a job no agent will ever see.
    if (printer.warehouseId == null) {
      throw new BadRequestException(
        `Printer "${printer.name}" is not assigned to a warehouse`,
      );
    }

    return printer as RoutablePrinter;
  }

  async enqueue(
    dto: CreatePrintJobDto,
    userId: number | null,
  ): Promise<{ job: PrintJob; created: boolean }> {
    const printer = await this.resolvePrinter(dto);

    const idempotencyKey = buildIdempotencyKey(
      dto.documentType,
      dto.documentRef,
      printer.id,
      dto.reprintSeq,
    );

    const existing = await this.jobs.findOne({ where: { idempotencyKey } });
    if (existing) {
      this.logger.debug(`Duplicate submission for ${idempotencyKey}; reusing job`);
      return { job: existing, created: false };
    }

    const job = await this.jobs.save(
      this.jobs.create({
        printerId: printer.id,
        warehouseId: printer.warehouseId,
        userId,
        documentType: dto.documentType,
        documentRef: dto.documentRef,
        idempotencyKey,
        status: 'queued',
        attempts: 0,
        maxAttempts: 3,
        queuedAt: new Date(),
      }),
    );

    this.notifier.notify(printer.warehouseId, job.id);
    return { job, created: true };
  }

  async findOne(id: string): Promise<PrintJob> {
    const job = await this.jobs.findOne({ where: { id } });
    if (!job) throw new NotFoundException('Print job not found');
    return job;
  }

  /**
   * Requeues a job an operator chose to retry.
   *
   * Only terminal jobs can be retried — requeuing something already in flight
   * would race the agent holding it. The idempotency key gains a reprint
   * sequence so it does not collide with the original.
   */
  async retry(id: string): Promise<PrintJob> {
    const job = await this.findOne(id);

    if (!['failed', 'cancelled'].includes(job.status)) {
      throw new BadRequestException(
        `Only failed or cancelled jobs can be retried; this one is "${job.status}"`,
      );
    }
    if (job.warehouseId == null) {
      throw new BadRequestException('Job has no warehouse and cannot be routed');
    }

    const nextSeq = (job.idempotencyKey.match(/:r(\d+)$/)?.[1]
      ? Number(job.idempotencyKey.match(/:r(\d+)$/)![1]) + 1
      : 1);

    const requeued = await this.jobs.save({
      ...job,
      status: 'queued',
      agentId: null,
      attempts: 0,
      claimedAt: null,
      completedAt: null,
      errorMessage: null,
      queuedAt: new Date(),
      idempotencyKey: buildIdempotencyKey(
        job.documentType,
        job.documentRef!,
        job.printerId!,
        nextSeq,
      ),
    });

    this.notifier.notify(job.warehouseId, requeued.id);
    return requeued;
  }

  async cancel(id: string): Promise<PrintJob> {
    const job = await this.findOne(id);

    // 'printing' is excluded on purpose: the bytes are already at the device
    // and cancelling would misreport what physically happened.
    if (!['queued', 'claimed'].includes(job.status)) {
      throw new BadRequestException(
        `Only queued or claimed jobs can be cancelled; this one is "${job.status}"`,
      );
    }

    return this.jobs.save({
      ...job,
      status: 'cancelled',
      completedAt: new Date(),
      errorMessage: 'cancelled by operator',
    });
  }
}
