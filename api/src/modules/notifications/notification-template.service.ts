import { Injectable, Logger } from '@nestjs/common';
import { Repository } from 'typeorm';
import { NotificationTemplate } from './entities/notification-template.entity';
import {
  DEFAULT_NOTIFICATION_TEMPLATES,
  NotificationTemplateDefault,
} from './notification-templates.defaults';
import { TenantConnectionService } from '../tenant/tenant-connection.service';
import { PushNotificationService } from './push-notification.service';
import { NotificationsService } from './notifications.service';

export interface NotificationRecipient {
  type: 'admins' | 'customer' | 'delivery';
  /** customerId (partner table id) — for 'customer' */
  customerId?: number;
  /** deliveryPersonId — for 'delivery' */
  deliveryPersonId?: number;
}

export interface SendNotificationRequest {
  key: string;
  /** Template variables for interpolation, e.g. { clientName: 'Ahmed', orderNumber: 'ORD-001' } */
  variables?: Record<string, string>;
  recipients: NotificationRecipient[];
  /** Extra JSON metadata stored in the in-app notification record */
  metadata?: Record<string, unknown>;
  /**
   * Optional deduplication key used as the BullMQ jobId.
   * When set, BullMQ will not enqueue a new job if one with the same ID
   * already exists in the queue (prevents duplicates from multiple API
   * instances or queue+fallback race conditions).
   */
  deduplicationKey?: string;
}

@Injectable()
export class NotificationTemplateService {
  private readonly logger = new Logger(NotificationTemplateService.name);

  constructor(
    private readonly tenantConnService: TenantConnectionService,
    private readonly pushNotificationService: PushNotificationService,
    private readonly notificationsService: NotificationsService,
  ) {}

  private get templateRepo(): Repository<NotificationTemplate> {
    return this.tenantConnService.getRepository(NotificationTemplate);
  }

  // ─── Template CRUD ──────────────────────────────────────────────────────────

  async findAll(): Promise<NotificationTemplate[]> {
    await this.seedDefaultsIfNeeded();
    return this.templateRepo.find({ order: { category: 'ASC', key: 'ASC' } });
  }

  async findByKey(key: string): Promise<NotificationTemplate | null> {
    const tpl = await this.templateRepo.findOne({ where: { key } });
    if (!tpl) {
      // Auto-seed this key if it's a known default
      const def = DEFAULT_NOTIFICATION_TEMPLATES.find((d) => d.key === key);
      if (def) {
        return this.seedTemplate(def);
      }
    }
    return tpl;
  }

  async update(
    key: string,
    data: Partial<
      Pick<
        NotificationTemplate,
        'titleFr' | 'bodyFr' | 'titleAr' | 'bodyAr' | 'enabled' | 'priority'
      >
    >,
  ): Promise<NotificationTemplate | null> {
    const tpl = await this.findByKey(key);
    if (!tpl) return null;
    Object.assign(tpl, data);
    return this.templateRepo.save(tpl);
  }

  async toggleEnabled(
    key: string,
    enabled: boolean,
  ): Promise<NotificationTemplate | null> {
    return this.update(key, { enabled });
  }

  async resetToDefault(key: string): Promise<NotificationTemplate | null> {
    const def = DEFAULT_NOTIFICATION_TEMPLATES.find((d) => d.key === key);
    if (!def) return null;
    const tpl = await this.findByKey(key);
    if (!tpl) return this.seedTemplate(def);
    Object.assign(tpl, {
      titleFr: def.titleFr,
      bodyFr: def.bodyFr,
      titleAr: def.titleAr,
      bodyAr: def.bodyAr,
      enabled: def.enabled,
      priority: def.priority,
    });
    return this.templateRepo.save(tpl);
  }

  async resetAllToDefaults(): Promise<void> {
    for (const def of DEFAULT_NOTIFICATION_TEMPLATES) {
      const tpl = await this.templateRepo.findOne({ where: { key: def.key } });
      if (tpl) {
        Object.assign(tpl, {
          titleFr: def.titleFr,
          bodyFr: def.bodyFr,
          titleAr: def.titleAr,
          bodyAr: def.bodyAr,
          enabled: def.enabled,
          priority: def.priority,
        });
        await this.templateRepo.save(tpl);
      } else {
        await this.seedTemplate(def);
      }
    }
  }

  // ─── Core Send ──────────────────────────────────────────────────────────────

  /**
   * Unified notification send method.
   * 1. Resolves template by key
   * 2. Checks if enabled → skips silently if not
   * 3. Interpolates template variables
   * 4. Dispatches push + in-app notifications to each recipient
   */
  async send(request: SendNotificationRequest): Promise<void> {
    const { key, variables = {}, recipients, metadata = {} } = request;

    try {
      const template = await this.findByKey(key);
      if (!template) {
        this.logger.warn(`Notification template '${key}' not found, skipping`);
        return;
      }

      if (!template.enabled) {
        this.logger.debug(`Notification '${key}' is disabled, skipping`);
        return;
      }

      const title = this.interpolate(template.titleFr, variables);
      const body = this.interpolate(template.bodyFr, variables);
      const priority = template.priority;

      for (const recipient of recipients) {
        await this.dispatchToRecipient(recipient, {
          key,
          title,
          body,
          priority,
          variables,
          metadata,
        });
      }
    } catch (error) {
      this.logger.error(
        `Failed to send notification '${key}': ${(error as Error)?.message}`,
        (error as Error)?.stack,
      );
    }
  }

  // ─── Dispatch ───────────────────────────────────────────────────────────────

  private async dispatchToRecipient(
    recipient: NotificationRecipient,
    payload: {
      key: string;
      title: string;
      body: string;
      priority: string;
      variables: Record<string, string>;
      metadata: Record<string, unknown>;
    },
  ): Promise<void> {
    const { key, title, body, priority, metadata } = payload;
    const pushPayload = {
      title,
      body,
      data: { type: key, ...this.stringifyValues(metadata) },
    };

    switch (recipient.type) {
      case 'admins': {
        await this.pushNotificationService
          .sendToAdmins(pushPayload)
          .catch(this.logPushError.bind(this));
        const adminIds = await this.pushNotificationService.getAdminUserIds();
        for (const adminId of adminIds) {
          await this.notificationsService.create({
            userId: adminId,
            type: key,
            title,
            message: body,
            priority,
            data: metadata,
          });
        }
        break;
      }

      case 'customer': {
        if (!recipient.customerId) break;
        await this.pushNotificationService
          .sendToCustomer(recipient.customerId, pushPayload)
          .catch(this.logPushError.bind(this));
        const customerUserId =
          await this.pushNotificationService.getUserIdByCustomerId(
            recipient.customerId,
          );
        if (customerUserId) {
          await this.notificationsService.create({
            userId: customerUserId,
            type: key,
            title,
            message: body,
            priority,
            data: metadata,
          });
        }
        break;
      }

      case 'delivery': {
        if (!recipient.deliveryPersonId) break;
        await this.pushNotificationService
          .sendToDeliveryPerson(recipient.deliveryPersonId, pushPayload)
          .catch(this.logPushError.bind(this));
        const deliveryUserId =
          this.pushNotificationService.getUserIdByDeliveryId(
            recipient.deliveryPersonId,
          );
        if (deliveryUserId) {
          await this.notificationsService.create({
            userId: deliveryUserId,
            type: key,
            title,
            message: body,
            priority,
            data: metadata,
          });
        }
        break;
      }
    }
  }

  // ─── Template Variable Interpolation ────────────────────────────────────────

  /**
   * Replaces {{variableName}} placeholders with actual values.
   * Unknown variables are left as-is.
   */
  interpolate(template: string, variables: Record<string, string>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) =>
      variables[key] !== undefined ? variables[key] : match,
    );
  }

  // ─── Seeding ────────────────────────────────────────────────────────────────

  async seedDefaultsIfNeeded(): Promise<void> {
    const count = await this.templateRepo.count();
    if (count === 0) {
      for (const def of DEFAULT_NOTIFICATION_TEMPLATES) {
        await this.seedTemplate(def);
      }
      this.logger.log(
        `Seeded ${DEFAULT_NOTIFICATION_TEMPLATES.length} default notification templates`,
      );
    }
  }

  private async seedTemplate(
    def: NotificationTemplateDefault,
  ): Promise<NotificationTemplate> {
    const tpl = this.templateRepo.create({
      key: def.key,
      category: def.category,
      portal: def.portal,
      titleFr: def.titleFr,
      bodyFr: def.bodyFr,
      titleAr: def.titleAr,
      bodyAr: def.bodyAr,
      description: def.description,
      enabled: def.enabled,
      priority: def.priority,
    });
    return this.templateRepo.save(tpl);
  }

  // ─── Helpers ────────────────────────────────────────────────────────────────

  private stringifyValues(
    obj: Record<string, unknown>,
  ): Record<string, string> {
    return Object.fromEntries(
      // eslint-disable-next-line @typescript-eslint/no-base-to-string
      Object.entries(obj).map(([k, v]) => [k, String(v ?? '')]),
    );
  }

  private logPushError(err: unknown): void {
    this.logger.warn(
      `Push notification failed (non-fatal): ${(err as Error)?.message}`,
    );
  }
}
