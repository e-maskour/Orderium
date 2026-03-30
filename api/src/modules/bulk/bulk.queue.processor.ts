import { Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { QueueName } from '../../common/queues/queue.constants';
import { tenantStorage } from '../tenant/tenant.context';
import { TenantConnectionService } from '../tenant/tenant-connection.service';
import { OrdersService } from '../orders/orders.service';
import { InvoicesService } from '../invoices/invoices.service';
import { ProductsService } from '../products/products.service';
import { MinioProvider } from '../images/providers/minio.provider';
import { BulkXlsxExportJobData, BulkJobResult } from './bulk.service';

@Processor(QueueName.BULK_OPERATIONS, { concurrency: 2 })
export class BulkQueueProcessor extends WorkerHost {
    private readonly logger = new Logger(BulkQueueProcessor.name);

    constructor(
        private readonly tenantConnService: TenantConnectionService,
        private readonly ordersService: OrdersService,
        private readonly invoicesService: InvoicesService,
        private readonly productsService: ProductsService,
        private readonly minioProvider: MinioProvider,
    ) {
        super();
    }

    async process(job: Job<BulkXlsxExportJobData>): Promise<BulkJobResult> {
        const { entity, supplierId, tenantSlug, tenantId, tenantName } = job.data;

        this.logger.log(
            `⚙️  Processing bulk export job [${job.id}]: ${entity} (tenant: ${tenantSlug})`,
        );

        // Pre-warm the per-tenant DB connection
        await this.tenantConnService.getConnection(tenantSlug);

        return tenantStorage.run({ tenantSlug, tenantId, tenantName }, async () => {
            const buffer = await this.generateBuffer(entity, supplierId);
            const filename = this.buildFilename(entity);

            const downloadUrl = await this.minioProvider.uploadBuffer(
                buffer,
                'exports',
                filename,
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            );

            this.logger.log(
                `✅ Bulk export complete [${job.id}]: ${filename} → ${downloadUrl}`,
            );

            return { downloadUrl, filename };
        });
    }

    private async generateBuffer(
        entity: string,
        supplierId?: number,
    ): Promise<Buffer> {
        switch (entity) {
            case 'orders':
                return this.ordersService.exportToXlsx(supplierId);
            case 'invoices':
                return this.invoicesService.exportToXlsx(supplierId);
            case 'products':
                return this.productsService.exportToXlsx();
            default:
                throw new Error(`Unknown export entity: ${entity}`);
        }
    }

    private buildFilename(entity: string): string {
        const ts = new Date().toISOString().replace(/[:.]/g, '-');
        const labels: Record<string, string> = {
            orders: 'Bons_Livraison',
            invoices: 'Factures',
            products: 'Produits',
        };
        return `${labels[entity] ?? entity}_${ts}.xlsx`;
    }
}
