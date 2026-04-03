import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { QueueName, PdfJobName } from '../../common/queues/queue.constants';
import { tenantStorage } from '../tenant/tenant.context';

export interface PdfJobData {
  documentType: string;
  documentId: number;
  tenantSlug: string;
  tenantId: number;
  tenantName: string;
}

@Injectable()
export class PdfQueueService {
  private readonly logger = new Logger(PdfQueueService.name);

  constructor(
    @InjectQueue(QueueName.PDF_GENERATION)
    private readonly pdfQueue: Queue<PdfJobData>,
  ) {}

  /**
   * Enqueue a background PDF generation + MinIO upload job.
   * Reads the current tenant context from AsyncLocalStorage.
   */
  async enqueue(documentType: string, documentId: number): Promise<void> {
    const ctx = tenantStorage.getStore();
    if (!ctx) {
      this.logger.warn(
        `No tenant context found — skipping PDF queue for ${documentType} #${documentId}`,
      );
      return;
    }

    await this.pdfQueue.add(
      PdfJobName.GENERATE_AND_UPLOAD,
      {
        documentType,
        documentId,
        tenantSlug: ctx.tenantSlug,
        tenantId: ctx.tenantId,
        tenantName: ctx.tenantName,
      },
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5_000 },
        removeOnComplete: { count: 100 },
        removeOnFail: { count: 50 },
      },
    );

    this.logger.debug(
      `📨 PDF job queued: ${documentType} #${documentId} (tenant: ${ctx.tenantSlug})`,
    );
  }
}
