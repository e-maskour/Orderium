import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { QueueName, NotificationJobName } from '../../common/queues/queue.constants';
import { tenantStorage } from '../tenant/tenant.context';
import { SendNotificationRequest } from './notification-template.service';

export interface NotificationJobData {
    request: SendNotificationRequest;
    tenantSlug: string;
    tenantId: number;
    tenantName: string;
}

@Injectable()
export class NotificationsQueueService {
    private readonly logger = new Logger(NotificationsQueueService.name);

    constructor(
        @InjectQueue(QueueName.NOTIFICATIONS)
        private readonly notificationsQueue: Queue<NotificationJobData>,
    ) { }

    /**
     * Enqueue a notification to be sent asynchronously.
     * Falls back to direct send if there is no tenant context.
     */
    async enqueue(request: SendNotificationRequest): Promise<boolean> {
        const ctx = tenantStorage.getStore();
        if (!ctx) {
            return false; // caller should fall back to direct send
        }

        try {
            await this.notificationsQueue.add(
                NotificationJobName.SEND,
                {
                    request,
                    tenantSlug: ctx.tenantSlug,
                    tenantId: ctx.tenantId,
                    tenantName: ctx.tenantName,
                },
                {
                    attempts: 3,
                    backoff: { type: 'exponential', delay: 3_000 },
                    removeOnComplete: { count: 200 },
                    removeOnFail: { count: 100 },
                },
            );

            this.logger.debug(
                `📨 Notification job queued: '${request.key}' (tenant: ${ctx.tenantSlug})`,
            );
            return true;
        } catch (err) {
            this.logger.warn(
                `Redis unavailable, notification '${request.key}' will be sent directly: ${(err as Error).message}`,
            );
            return false; // caller falls back to synchronous send
        }
    }
}
