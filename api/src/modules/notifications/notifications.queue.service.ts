import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import {
  QueueName,
  NotificationJobName,
} from '../../common/queues/queue.constants';
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
  ) {}

  /**
   * Enqueue a notification to be sent asynchronously.
   * Returns false ONLY when there is no tenant context (caller should fall back to direct send).
   * Throws when Redis is unavailable — callers must NOT fall back in that case to avoid
   * duplicate sends if the job was already written to the queue before the error.
   */
  async enqueue(request: SendNotificationRequest): Promise<boolean> {
    const ctx = tenantStorage.getStore();
    if (!ctx) {
      return false; // caller should fall back to direct send
    }

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
        // Deduplication: if a job with this ID already exists in the queue
        // (waiting or active), BullMQ will return the existing job without
        // creating a new one — prevents duplicate notifications from multiple
        // API instances or a queue+fallback race condition.
        ...(request.deduplicationKey
          ? { jobId: request.deduplicationKey }
          : {}),
      },
    );

    this.logger.debug(
      `📨 Notification job queued: '${request.key}' (tenant: ${ctx.tenantSlug})`,
    );
    return true;
  }
}
