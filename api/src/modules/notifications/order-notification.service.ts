import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  PushNotificationService,
  PushNotificationPayload,
} from './push-notification.service';
import { NotificationsService } from './notifications.service';
import { Order, DeliveryStatus } from '../orders/entities/order.entity';
import { OrderDelivery } from '../delivery/entities/delivery.entity';

/**
 * Service responsible for sending notifications based on order-related events.
 * Implements the three main notification rules:
 * 1. Client creates order -> Admin receives notification
 * 2. Admin assigns order -> Customer and Delivery person receive notifications
 * 3. Delivery status changes -> Customer receives notification
 */
@Injectable()
export class OrderNotificationService {
  private readonly logger = new Logger(OrderNotificationService.name);

  // Human-readable delivery status labels
  private readonly deliveryStatusLabels: Record<DeliveryStatus, string> = {
    [DeliveryStatus.PENDING]: 'En attente',
    [DeliveryStatus.ASSIGNED]: 'Assignée',
    [DeliveryStatus.CONFIRMED]: 'Confirmée',
    [DeliveryStatus.PICKED_UP]: 'Récupérée',
    [DeliveryStatus.TO_DELIVERY]: 'En route',
    [DeliveryStatus.IN_DELIVERY]: 'En livraison',
    [DeliveryStatus.DELIVERED]: 'Livrée',
    [DeliveryStatus.CANCELED]: 'Annulée',
  };

  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(OrderDelivery)
    private readonly orderDeliveryRepository: Repository<OrderDelivery>,
    private readonly pushNotificationService: PushNotificationService,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * RULE 1: When a client creates an order, notify all admins
   */
  async notifyNewOrderFromClient(order: Order): Promise<void> {
    try {
      const payload: PushNotificationPayload = {
        title: '🛒 Nouvelle commande',
        body: `Commande #${order.documentNumber} reçue${order.customer?.name ? ` de ${order.customer.name}` : ''}`,
        data: {
          type: 'new_order',
          orderId: order.id.toString(),
          orderNumber: order.documentNumber,
          customerName: order.customer?.name || order.customerName || '',
        },
        clickAction: `/orders/${order.id}`,
      };

      // Send push notification to all admins
      await this.pushNotificationService.sendToAdmins(payload);

      // Create in-app notification for all admins
      const adminIds = await this.pushNotificationService.getAdminUserIds();
      for (const adminId of adminIds) {
        await this.notificationsService.create({
          userId: adminId,
          type: 'new_order',
          title: payload.title,
          message: payload.body,
          data: payload.data,
        });
      }

      this.logger.log(
        `Notified admins about new order #${order.documentNumber}`,
      );
    } catch (error) {
      this.logger.error(`Failed to notify admins about new order:`, error);
    }
  }

  /**
   * RULE 2: When admin assigns order to delivery person, notify customer and delivery person
   */
  async notifyOrderAssigned(
    order: Order,
    deliveryPersonId: number,
    deliveryPersonName: string,
  ): Promise<void> {
    try {
      // Notify customer
      if (order.customerId) {
        const customerPayload: PushNotificationPayload = {
          title: '📦 Commande assignée',
          body: `Votre commande #${order.documentNumber} a été assignée à ${deliveryPersonName}`,
          data: {
            type: 'order_assigned',
            orderId: order.id.toString(),
            orderNumber: order.documentNumber,
            deliveryPersonName,
          },
          clickAction: `/orders/${order.id}`,
        };

        await this.pushNotificationService.sendToCustomer(
          order.customerId,
          customerPayload,
        );

        // Create in-app notification for customer
        const customerUserId =
          await this.pushNotificationService.getUserIdByCustomerId(
            order.customerId,
          );
        if (customerUserId) {
          await this.notificationsService.create({
            userId: customerUserId,
            type: 'order_assigned',
            title: customerPayload.title,
            message: customerPayload.body,
            data: customerPayload.data,
          });
        }
      }

      // Notify delivery person
      const deliveryPayload: PushNotificationPayload = {
        title: '🚚 Nouvelle assignation',
        body: `Commande #${order.documentNumber} vous a été assignée${order.customer?.name ? ` - Client: ${order.customer.name}` : ''}`,
        data: {
          type: 'delivery_assigned',
          orderId: order.id.toString(),
          orderNumber: order.documentNumber,
          customerName: order.customer?.name || '',
          customerAddress: order.customer?.address || '',
        },
        clickAction: `/deliveries/${order.id}`,
      };

      await this.pushNotificationService.sendToDeliveryPerson(
        deliveryPersonId,
        deliveryPayload,
      );

      // Create in-app notification for delivery person
      const deliveryUserId =
        await this.pushNotificationService.getUserIdByDeliveryId(
          deliveryPersonId,
        );
      if (deliveryUserId) {
        await this.notificationsService.create({
          userId: deliveryUserId,
          type: 'delivery_assigned',
          title: deliveryPayload.title,
          message: deliveryPayload.body,
          data: deliveryPayload.data,
        });
      }

      this.logger.log(
        `Notified customer and delivery person about order #${order.documentNumber} assignment`,
      );
    } catch (error) {
      this.logger.error(`Failed to notify about order assignment:`, error);
    }
  }

  /**
   * RULE 3: When delivery status changes, notify customer
   */
  async notifyDeliveryStatusChanged(
    order: Order,
    oldStatus: DeliveryStatus | null,
    newStatus: DeliveryStatus,
  ): Promise<void> {
    try {
      // Only notify if there's a customer and status actually changed
      if (!order.customerId || oldStatus === newStatus) {
        return;
      }

      const statusLabel = this.deliveryStatusLabels[newStatus] || newStatus;
      let emoji = '📦';

      // Customize emoji based on status
      switch (newStatus) {
        case DeliveryStatus.CONFIRMED:
          emoji = '✅';
          break;
        case DeliveryStatus.PICKED_UP:
          emoji = '📦';
          break;
        case DeliveryStatus.TO_DELIVERY:
        case DeliveryStatus.IN_DELIVERY:
          emoji = '🚚';
          break;
        case DeliveryStatus.DELIVERED:
          emoji = '🎉';
          break;
        case DeliveryStatus.CANCELED:
          emoji = '❌';
          break;
      }

      const payload: PushNotificationPayload = {
        title: `${emoji} Mise à jour de livraison`,
        body: `Commande #${order.documentNumber}: ${statusLabel}`,
        data: {
          type: 'delivery_status_update',
          orderId: order.id.toString(),
          orderNumber: order.documentNumber,
          oldStatus: oldStatus || '',
          newStatus,
          deliveryStatus: statusLabel,
        },
        clickAction: `/orders/${order.id}`,
      };

      await this.pushNotificationService.sendToCustomer(
        order.customerId,
        payload,
      );

      // Create in-app notification
      const customerUserId =
        await this.pushNotificationService.getUserIdByCustomerId(
          order.customerId,
        );
      if (customerUserId) {
        await this.notificationsService.create({
          userId: customerUserId,
          type: 'delivery_status_update',
          title: payload.title,
          message: payload.body,
          data: payload.data,
        });
      }

      this.logger.log(
        `Notified customer about order #${order.documentNumber} status change to ${newStatus}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to notify about delivery status change:`,
        error,
      );
    }
  }

  /**
   * Helper to load full order with customer relation
   */
  async loadOrderWithCustomer(orderId: number): Promise<Order | null> {
    return this.orderRepository.findOne({
      where: { id: orderId },
      relations: ['customer'],
    });
  }

  /**
   * Get delivery person info for an order
   */
  async getDeliveryPersonForOrder(
    orderId: number,
  ): Promise<{ id: number; name: string } | null> {
    const orderDelivery = await this.orderDeliveryRepository.findOne({
      where: { orderId },
      relations: ['deliveryPerson'],
    });

    if (!orderDelivery?.deliveryPerson) {
      return null;
    }

    return {
      id: orderDelivery.deliveryPerson.id,
      name: orderDelivery.deliveryPerson.name,
    };
  }
}
