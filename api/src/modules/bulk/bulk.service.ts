import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Job, Queue } from 'bullmq';
import { QueueName, BulkJobName, BulkExportEntity } from '../../common/queues/queue.constants';
import { tenantStorage } from '../tenant/tenant.context';

export interface BulkXlsxExportJobData {
    entity: BulkExportEntity;
    supplierId?: number;
    tenantSlug: string;
    tenantId: number;
    tenantName: string;
}

export interface BulkJobResult {
    downloadUrl: string;
    filename: string;
}

@Injectable()
export class BulkService {
    private readonly logger = new Logger(BulkService.name);

    constructor(
        @InjectQueue(QueueName.BULK_OPERATIONS)
        private readonly bulkQueue: Queue<BulkXlsxExportJobData>,
    ) { }

    /**
     * Enqueue an async XLSX export job.
     * Returns the BullMQ job ID, which the client can poll for status.
     */
    async enqueueXlsxExport(
        entity: BulkExportEntity,
        supplierId?: number,
    ): Promise<string> {
        const ctx = tenantStorage.getStore();
        if (!ctx) {
            throw new Error('No tenant context available for bulk export');
        }

        const job = await this.bulkQueue.add(
            BulkJobName.XLSX_EXPORT,
            {
                entity,
                supplierId,
                tenantSlug: ctx.tenantSlug,
                tenantId: ctx.tenantId,
                tenantName: ctx.tenantName,
            },
            {
                attempts: 2,
                backoff: { type: 'fixed', delay: 10_000 },
                removeOnComplete: { age: 3600, count: 50 }, // keep 1 hour
                removeOnFail: { count: 20 },
            },
        );

        this.logger.debug(
            `📨 Bulk export job queued [${job.id}]: ${entity} (tenant: ${ctx.tenantSlug})`,
        );
        return job.id!;
    }

    /**
     * Poll the status and result of a bulk job by its ID.
     */
    async getJobStatus(jobId: string): Promise<{
        status: string;
        result?: BulkJobResult;
        failedReason?: string;
    }> {
        const job: Job<BulkXlsxExportJobData> | undefined = await this.bulkQueue.getJob(jobId);

        if (!job) {
            return { status: 'not-found' };
        }

        const state = await job.getState();

        if (state === 'completed' && job.returnvalue) {
            return { status: 'completed', result: job.returnvalue as BulkJobResult };
        }

        if (state === 'failed') {
            return { status: 'failed', failedReason: job.failedReason };
        }

        return { status: state };
    }
}
