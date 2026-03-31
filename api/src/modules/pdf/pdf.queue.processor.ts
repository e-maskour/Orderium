import { Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Repository } from 'typeorm';
import { QueueName } from '../../common/queues/queue.constants';
import { tenantStorage } from '../tenant/tenant.context';
import { TenantConnectionService } from '../tenant/tenant-connection.service';
import { PDFService } from './pdf.service';
import { Invoice } from '../invoices/entities/invoice.entity';
import { Quote } from '../quotes/entities/quote.entity';
import { Order } from '../orders/entities/order.entity';
import { PdfJobData } from './pdf.queue.service';

@Processor(QueueName.PDF_GENERATION, { concurrency: 1 })
export class PdfQueueProcessor extends WorkerHost {
    private readonly logger = new Logger(PdfQueueProcessor.name);

    constructor(
        private readonly pdfService: PDFService,
        private readonly tenantConnService: TenantConnectionService,
    ) {
        super();
    }

    async process(job: Job<PdfJobData>): Promise<void> {
        const { documentType, documentId, tenantSlug, tenantId, tenantName } = job.data;

        this.logger.log(
            `⚙️  Processing PDF job [${job.id}]: ${documentType} #${documentId} (tenant: ${tenantSlug})`,
        );

        // Pre-warm the per-tenant DB connection
        await this.tenantConnService.getConnection(tenantSlug);

        await tenantStorage.run({ tenantSlug, tenantId, tenantName }, async () => {
            const pdfUrl = await this.pdfService.generateAndUploadPDF(
                documentType as 'invoice' | 'quote' | 'delivery-note' | 'receipt',
                documentId,
            );

            if (pdfUrl) {
                const repo = this.getEntityRepository(documentType);
                if (repo) {
                    await repo.update(documentId, { pdfUrl } as Record<string, unknown>);
                }
                this.logger.log(
                    `✅ PDF stored for ${documentType} #${documentId}: ${pdfUrl}`,
                );
            }
        });
    }

    private getEntityRepository(
        documentType: string,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ): Repository<any> | null {
        switch (documentType) {
            case 'invoice':
                return this.tenantConnService.getRepository(Invoice);
            case 'quote':
                return this.tenantConnService.getRepository(Quote);
            case 'delivery-note':
            case 'receipt':
                return this.tenantConnService.getRepository(Order);
            default:
                this.logger.warn(`Unknown document type for repo lookup: ${documentType}`);
                return null;
        }
    }
}
