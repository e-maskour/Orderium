import { Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { QueueName } from '../../common/queues/queue.constants';
import { tenantStorage } from '../tenant/tenant.context';
import { TenantConnectionService } from '../tenant/tenant-connection.service';
import { NotificationTemplateService } from './notification-template.service';
import { NotificationJobData } from './notifications.queue.service';

@Processor(QueueName.NOTIFICATIONS, { concurrency: 5 })
export class NotificationsQueueProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationsQueueProcessor.name);

  constructor(
    private readonly templateService: NotificationTemplateService,
    private readonly tenantConnService: TenantConnectionService,
  ) {
    super();
  }

  async process(job: Job<NotificationJobData>): Promise<void> {
    const { request, tenantSlug, tenantId, tenantName } = job.data;

    this.logger.debug(
      `⚙️  Processing notification job [${job.id}]: '${request.key}' (tenant: ${tenantSlug})`,
    );

    // Pre-warm the per-tenant DB connection
    await this.tenantConnService.getConnection(tenantSlug);

    await tenantStorage.run({ tenantSlug, tenantId, tenantName }, async () => {
      await this.templateService.send(request);
    });
  }
}
