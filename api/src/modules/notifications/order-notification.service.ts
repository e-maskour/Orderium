import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { Repository } from 'typeorm';
import { Order, DeliveryStatus } from '../orders/entities/order.entity';
import { TenantConnectionService } from '../tenant/tenant-connection.service';
import { tenantStorage } from '../tenant/tenant.context';
import { NotificationTemplateService } from './notification-template.service';
import { NotificationsQueueService } from './notifications.queue.service';
import { Product } from '../products/entities/product.entity';
import { Invoice } from '../invoices/entities/invoice.entity';
import { DeliveryPerson } from '../delivery/entities/delivery.entity';

/**
 * Central notification trigger service.
 * All business events that require notifications are handled here.
 * Each method resolves the correct template, interpolates variables,
 * and dispatches via NotificationTemplateService.send().
 */
@Injectable()
export class OrderNotificationService {
  private readonly logger = new Logger(OrderNotificationService.name);

  constructor(
    private readonly tenantConnService: TenantConnectionService,
    @Inject(forwardRef(() => NotificationTemplateService))
    private readonly templateService: NotificationTemplateService,
    private readonly notificationsQueueService: NotificationsQueueService,
  ) {}

  private get orderRepository(): Repository<Order> {
    return this.tenantConnService.getRepository(Order);
  }

  private get productRepository(): Repository<Product> {
    return this.tenantConnService.getRepository(Product);
  }

  private get invoiceRepository(): Repository<Invoice> {
    return this.tenantConnService.getRepository(Invoice);
  }

  private get deliveryPersonRepository(): Repository<DeliveryPerson> {
    return this.tenantConnService.getRepository(DeliveryPerson);
  }

  // ─── Client → Backoffice ─────────────────────────────────────────────────────

  /** Client registers a new account → notify admins */
  async notifyClientRegistered(
    clientName: string,
    clientId: number,
  ): Promise<void> {
    await this.fire('CLIENT_REGISTERED', { clientName }, [{ type: 'admins' }], {
      portalUserId: clientId,
    });
  }

  /** Client places a new order → notify admins */
  async notifyNewOrderFromClient(order: Order): Promise<void> {
    const clientName = order.customer?.name || order.customerName || 'Client';
    await this.fire(
      'ORDER_PLACED',
      {
        clientName,
        orderNumber: order.documentNumber,
        orderId: String(order.id),
      },
      [{ type: 'admins' }],
      { orderId: order.id, orderNumber: order.documentNumber },
    );
  }

  /** Client cancels their own order → notify admins */
  async notifyOrderCancelledByClient(order: Order): Promise<void> {
    const clientName = order.customer?.name || order.customerName || 'Client';
    await this.fire(
      'ORDER_CANCELLED_BY_CLIENT',
      {
        clientName,
        orderNumber: order.documentNumber,
        orderId: String(order.id),
      },
      [{ type: 'admins' }],
      { orderId: order.id, orderNumber: order.documentNumber },
    );
  }

  /** Client updates profile / address → notify admins */
  async notifyClientProfileUpdated(
    clientName: string,
    clientId: number,
  ): Promise<void> {
    await this.fire(
      'CLIENT_PROFILE_UPDATED',
      { clientName },
      [{ type: 'admins' }],
      {
        portalUserId: clientId,
      },
    );
  }

  /** Client submits a complaint / review → notify admins */
  async notifyClientComplaint(
    clientName: string,
    clientId: number,
  ): Promise<void> {
    await this.fire('CLIENT_COMPLAINT', { clientName }, [{ type: 'admins' }], {
      portalUserId: clientId,
    });
  }

  // ─── Admin → Delivery Portal ─────────────────────────────────────────────────

  /** Admin assigns order to driver → notify driver + client */
  async notifyOrderAssigned(
    order: Order,
    deliveryPersonId: number,
    deliveryPersonName: string,
  ): Promise<void> {
    const clientName = order.customer?.name || order.customerName || 'Client';
    await this.fire(
      'ORDER_ASSIGNED_DRIVER',
      {
        orderNumber: order.documentNumber,
        clientName,
        driverName: deliveryPersonName,
      },
      [{ type: 'delivery', deliveryPersonId }],
      { orderId: order.id, orderNumber: order.documentNumber },
    );
    if (order.customerId) {
      await this.fire(
        'ORDER_ASSIGNED_CLIENT',
        {
          orderNumber: order.documentNumber,
          clientName,
          driverName: deliveryPersonName,
        },
        [{ type: 'customer', customerId: order.customerId }],
        { orderId: order.id, orderNumber: order.documentNumber },
      );
    }
  }

  /** Admin reassigns order to a different driver → notify new driver */
  async notifyOrderReassigned(
    order: Order,
    newDeliveryPersonId: number,
    newDeliveryPersonName: string,
  ): Promise<void> {
    const clientName = order.customer?.name || order.customerName || 'Client';
    await this.fire(
      'ORDER_REASSIGNED_DRIVER',
      {
        orderNumber: order.documentNumber,
        clientName,
        driverName: newDeliveryPersonName,
      },
      [{ type: 'delivery', deliveryPersonId: newDeliveryPersonId }],
      { orderId: order.id, orderNumber: order.documentNumber },
    );
  }

  /** Admin cancels assigned order → notify driver */
  async notifyOrderCancelledByAdmin_Driver(
    order: Order,
    deliveryPersonId: number,
  ): Promise<void> {
    await this.fire(
      'ORDER_CANCELLED_BY_ADMIN_DRIVER',
      { orderNumber: order.documentNumber },
      [{ type: 'delivery', deliveryPersonId }],
      { orderId: order.id, orderNumber: order.documentNumber },
    );
  }

  /** Admin marks fromClient order as delivered → notify client */
  async notifyOrderDeliveredToClient(order: Order): Promise<void> {
    if (!order.customerId) return;
    await this.fire(
      'ORDER_DELIVERED_CLIENT',
      { orderNumber: order.documentNumber },
      [{ type: 'customer', customerId: order.customerId }],
      { orderId: order.id, orderNumber: order.documentNumber },
    );
  }

  /** Admin cancels fromClient order → notify client */
  async notifyOrderCancelledByAdmin_Client(order: Order): Promise<void> {
    if (!order.customerId) return;
    await this.fire(
      'ORDER_CANCELLED_BY_ADMIN_CLIENT',
      { orderNumber: order.documentNumber },
      [{ type: 'customer', customerId: order.customerId }],
      { orderId: order.id, orderNumber: order.documentNumber },
    );
  }

  /** Admin sends a custom message to a client */
  async notifyAdminCustomMessage(
    customerId: number,
    title: string,
    message: string,
  ): Promise<void> {
    await this.fire(
      'ADMIN_CUSTOM_MESSAGE',
      { title, message },
      [{ type: 'customer', customerId }],
      {},
    );
  }

  // ─── Delivery → Admin + Client ────────────────────────────────────────────────

  /** Driver starts delivery (IN_DELIVERY) → notify admin + client */
  async notifyDeliveryInProgress(
    order: Order,
    deliveryPersonName: string,
  ): Promise<void> {
    const clientName = order.customer?.name || order.customerName || 'Client';
    await this.fire(
      'DELIVERY_IN_PROGRESS_ADMIN',
      {
        driverName: deliveryPersonName,
        orderNumber: order.documentNumber,
        clientName,
      },
      [{ type: 'admins' }],
      { orderId: order.id, orderNumber: order.documentNumber },
    );
    if (order.customerId) {
      await this.fire(
        'DELIVERY_IN_PROGRESS_CLIENT',
        { driverName: deliveryPersonName, orderNumber: order.documentNumber },
        [{ type: 'customer', customerId: order.customerId }],
        { orderId: order.id, orderNumber: order.documentNumber },
      );
    }
  }

  /** Driver marks order as delivered → notify admin + client */
  async notifyDeliveryCompleted(
    order: Order,
    deliveryPersonName: string,
  ): Promise<void> {
    const clientName = order.customer?.name || order.customerName || 'Client';
    await this.fire(
      'DELIVERY_COMPLETED_ADMIN',
      {
        driverName: deliveryPersonName,
        orderNumber: order.documentNumber,
        clientName,
      },
      [{ type: 'admins' }],
      { orderId: order.id, orderNumber: order.documentNumber },
    );
    if (order.customerId) {
      await this.fire(
        'DELIVERY_COMPLETED_CLIENT',
        { orderNumber: order.documentNumber },
        [{ type: 'customer', customerId: order.customerId }],
        { orderId: order.id, orderNumber: order.documentNumber },
      );
    }
  }

  /** Driver reports delivery failed → notify admin + client */
  async notifyDeliveryFailed(
    order: Order,
    deliveryPersonName: string,
  ): Promise<void> {
    const clientName = order.customer?.name || order.customerName || 'Client';
    await this.fire(
      'DELIVERY_FAILED_ADMIN',
      {
        driverName: deliveryPersonName,
        orderNumber: order.documentNumber,
        clientName,
      },
      [{ type: 'admins' }],
      { orderId: order.id, orderNumber: order.documentNumber },
    );
    if (order.customerId) {
      await this.fire(
        'DELIVERY_FAILED_CLIENT',
        { orderNumber: order.documentNumber },
        [{ type: 'customer', customerId: order.customerId }],
        { orderId: order.id, orderNumber: order.documentNumber },
      );
    }
  }

  /**
   * Backward-compatible entry point for delivery status changes.
   * Called from DeliveryService.updateOrderStatus().
   */
  async notifyDeliveryStatusChanged(
    order: Order,
    _oldStatus: DeliveryStatus | null,
    newStatus: DeliveryStatus,
    deliveryPersonName = 'Livreur',
  ): Promise<void> {
    switch (newStatus) {
      case DeliveryStatus.IN_DELIVERY:
        await this.notifyDeliveryInProgress(order, deliveryPersonName);
        break;
      case DeliveryStatus.DELIVERED:
        await this.notifyDeliveryCompleted(order, deliveryPersonName);
        break;
      case DeliveryStatus.CANCELED:
        await this.notifyDeliveryFailed(order, deliveryPersonName);
        break;
    }
  }

  // ─── System ───────────────────────────────────────────────────────────────────

  /** New driver registered → notify admins */
  async notifyDriverRegistered(
    driverName: string,
    driverId: number,
  ): Promise<void> {
    await this.fire('DRIVER_REGISTERED', { driverName }, [{ type: 'admins' }], {
      deliveryPersonId: driverId,
    });
  }

  // ─── Stock Alerts ─────────────────────────────────────────────────────────────

  /** Single product low-stock alert */
  async notifyStockLow(product: Product): Promise<void> {
    const threshold = product.stockAlertThreshold ?? 5;
    await this.fire(
      'STOCK_LOW_ALERT',
      {
        productName: product.name,
        stock: String(product.stock ?? 0),
        threshold: String(threshold),
      },
      [{ type: 'admins' }],
      { productId: product.id, productName: product.name },
    );
  }

  /** Daily summary: multiple products below threshold */
  async notifyStockDailySummary(count: number): Promise<void> {
    if (count === 0) return;
    await this.fire(
      'STOCK_DAILY_SUMMARY',
      { count: String(count) },
      [{ type: 'admins' }],
      { count },
    );
  }

  // ─── Payment Due Alerts ───────────────────────────────────────────────────────

  /** Single overdue order alert */
  async notifyOrderPaymentOverdue(order: Order): Promise<void> {
    const clientName = order.customer?.name || order.customerName || 'Client';
    const dueDate = order.amountDueDate
      ? new Date(order.amountDueDate).toLocaleDateString('fr-MA')
      : '—';
    await this.fire(
      'ORDER_PAYMENT_OVERDUE',
      {
        orderNumber: order.documentNumber,
        clientName,
        amount: String(order.remainingAmount ?? 0),
        dueDate,
      },
      [{ type: 'admins' }],
      { orderId: order.id, orderNumber: order.documentNumber },
    );
  }

  /** Single overdue invoice alert */
  async notifyInvoicePaymentOverdue(invoice: Invoice): Promise<void> {
    const clientName =
      invoice.customer?.name || invoice.customerName || 'Client';
    const dueDate = invoice.amountDueDate
      ? new Date(invoice.amountDueDate).toLocaleDateString('fr-MA')
      : '—';
    await this.fire(
      'INVOICE_PAYMENT_OVERDUE',
      {
        invoiceNumber: invoice.documentNumber,
        clientName,
        amount: String(invoice.remainingAmount ?? 0),
        dueDate,
      },
      [{ type: 'admins' }],
      { invoiceId: invoice.id, invoiceNumber: invoice.documentNumber },
    );
  }

  // ─── Sales Reports ─────────────────────────────────────────────────────────────

  async notifyDailySalesSummary(
    date: string,
    ordersCount: number,
    amount: number,
  ): Promise<void> {
    await this.fire(
      'DAILY_SALES_SUMMARY',
      { date, ordersCount: String(ordersCount), amount: String(amount) },
      [{ type: 'admins' }],
      { date, ordersCount, amount },
    );
  }

  async notifyWeeklyRevenueReport(
    weekStart: string,
    ordersCount: number,
    amount: number,
  ): Promise<void> {
    await this.fire(
      'WEEKLY_REVENUE_REPORT',
      { weekStart, ordersCount: String(ordersCount), amount: String(amount) },
      [{ type: 'admins' }],
      { weekStart, ordersCount, amount },
    );
  }

  async notifyQuotesExpiringSoon(
    count: number,
    quoteNumbers: string[],
  ): Promise<void> {
    if (count === 0) return;
    await this.fire(
      'QUOTES_EXPIRING_SOON',
      { count: String(count), quotes: quoteNumbers.join(', ') },
      [{ type: 'admins' }],
      { count, quoteNumbers },
    );
  }

  // ─── Internal Helper ─────────────────────────────────────────────────────────

  /**
   * Build a deterministic deduplication key to prevent the same notification
   * from being enqueued more than once (e.g. from multiple API instances or a
   * queue-write-then-error race condition).
   *
   * - Entity-based events use the first available entity ID from metadata so
   *   each distinct event has its own queue slot.
   * - Scheduled/aggregate notifications (no single entity ID) use the current
   *   UTC date so a daily job can only be queued once per day.
   */
  private buildDeduplicationKey(
    key: string,
    metadata: Record<string, unknown>,
  ): string {
    const tenant = tenantStorage.getStore()?.tenantSlug ?? 'unknown';
    const entityId =
      metadata.orderId ??
      metadata.invoiceId ??
      metadata.productId ??
      metadata.deliveryPersonId ??
      metadata.portalUserId ??
      null;
    if (entityId !== null) {
      return `${key}-${tenant}-${entityId as number | string}`;
    }
    const date = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    return `${key}-${tenant}-${date}`;
  }

  private async fire(
    key: string,
    variables: Record<string, string>,
    recipients: {
      type: 'admins' | 'customer' | 'delivery';
      customerId?: number;
      deliveryPersonId?: number;
    }[],
    metadata: Record<string, unknown>,
  ): Promise<void> {
    try {
      const deduplicationKey = this.buildDeduplicationKey(key, metadata);
      const queued = await this.notificationsQueueService.enqueue({
        key,
        variables,
        recipients,
        metadata,
        deduplicationKey,
      });
      if (!queued) {
        // No tenant context — fall back to synchronous send
        await this.templateService.send({
          key,
          variables,
          recipients,
          metadata,
        });
      }
    } catch (err) {
      // Redis error: the job may already be in the queue, so do NOT fall back
      // to a direct send here — that would cause duplicate notifications.
      this.logger.error(
        `Notification '${key}' failed: ${(err as Error)?.message}`,
        (err as Error)?.stack,
      );
    }
  }
}
