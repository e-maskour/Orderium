import { getIO } from '../socket';
import { logger } from '../../utils/logger';
import { notificationService } from '../../modules/notifications/notification.service';

export interface OrderEventData {
  orderId: number;
  orderNumber: string;
  customerId: number;
  deliveryPersonId?: number;
  status?: string;
  timestamp?: Date;
}

/**
 * Emit when a new order is created
 * Sends to: admin room, customer-{customerId} room
 */
export const emitOrderCreated = async (data: OrderEventData) => {
  const io = getIO();
  if (!io) {
    logger.error('Socket.io not initialized');
    return;
  }

  // Create notification for admin
  const adminNotification = await notificationService.create({
    UserType: 'admin',
    Title: 'notifications.newOrder',
    Message: data.orderNumber,
    Type: 'order_created',
    OrderId: data.orderId,
    OrderNumber: data.orderNumber,
  });

  // Create notification for customer
  const customerNotification = await notificationService.create({
    CustomerId: data.customerId,
    UserType: 'customer',
    Title: 'notifications.newOrder',
    Message: data.orderNumber,
    Type: 'order_created',
    OrderId: data.orderId,
    OrderNumber: data.orderNumber,
  });

  // Notify admin panel
  io.to('admin').emit('order:created', data);
  io.to('admin').emit('notification:new', adminNotification);
  
  // Notify the customer who placed the order
  io.to(`customer-${data.customerId}`).emit('order:created', data);
  io.to(`customer-${data.customerId}`).emit('notification:new', customerNotification);

  logger.info(`Order created event emitted: ${data.orderNumber}`);
};

/**
 * Emit when an order is assigned to a delivery person
 * Sends to: admin room, delivery-{deliveryPersonId} room, customer-{customerId} room
 */
export const emitOrderAssigned = async (data: OrderEventData) => {
  const io = getIO();
  if (!io) {
    logger.error('Socket.io not initialized');
    return;
  }

  if (!data.deliveryPersonId) {
    logger.error('Cannot emit order assigned without deliveryPersonId');
    return;
  }

  // Create notification for admin
  const adminNotification = await notificationService.create({
    UserType: 'admin',
    Title: 'notifications.orderAssigned',
    Message: data.orderNumber,
    Type: 'order_assigned',
    OrderId: data.orderId,
    OrderNumber: data.orderNumber,
  });

  // Create notification for delivery person
  const deliveryNotification = await notificationService.create({
    DeliveryPersonId: data.deliveryPersonId,
    UserType: 'delivery',
    Title: 'notifications.orderAssigned',
    Message: data.orderNumber,
    Type: 'order_assigned',
    OrderId: data.orderId,
    OrderNumber: data.orderNumber,
  });

  // Create notification for customer
  const customerNotification = await notificationService.create({
    CustomerId: data.customerId,
    UserType: 'customer',
    Title: 'notifications.orderAssigned',
    Message: data.orderNumber,
    Type: 'order_assigned',
    OrderId: data.orderId,
    OrderNumber: data.orderNumber,
  });

  // Notify admin panel
  io.to('admin').emit('order:assigned', data);
  io.to('admin').emit('notification:new', adminNotification);
  
  // Notify the delivery person
  io.to(`delivery-${data.deliveryPersonId}`).emit('order:assigned', data);
  io.to(`delivery-${data.deliveryPersonId}`).emit('notification:new', deliveryNotification);
  
  // Notify the customer
  io.to(`customer-${data.customerId}`).emit('order:assigned', data);
  io.to(`customer-${data.customerId}`).emit('notification:new', customerNotification);

  logger.info(`Order assigned event emitted: ${data.orderNumber} to delivery person ${data.deliveryPersonId}`);
};

/**
 * Emit when order status changes
 * Sends to: admin room, delivery-{deliveryPersonId} room (if assigned), customer-{customerId} room
 */
export const emitOrderStatusChanged = async (data: OrderEventData) => {
  const io = getIO();
  if (!io) {
    logger.error('Socket.io not initialized');
    return;
  }

  const statusLabels: Record<string, string> = {
    to_delivery: 'Confirmed',
    in_delivery: 'In Delivery',
    delivered: 'Delivered',
  };

  const statusLabel = statusLabels[data.status || ''] || data.status;

  // Create notification for admin
  const adminNotification = await notificationService.create({
    UserType: 'admin',
    Title: 'notifications.statusChanged',
    Message: `${data.orderNumber}|status.${data.status}`,
    Type: 'order_status_changed',
    OrderId: data.orderId,
    OrderNumber: data.orderNumber,
  });

  // Create notification for delivery person if assigned
  let deliveryNotification;
  if (data.deliveryPersonId) {
    deliveryNotification = await notificationService.create({
      DeliveryPersonId: data.deliveryPersonId,
      UserType: 'delivery',
      Title: 'notifications.statusChanged',
      Message: `${data.orderNumber}|status.${data.status}`,
      Type: 'order_status_changed',
      OrderId: data.orderId,
      OrderNumber: data.orderNumber,
    });
  }

  // Create notification for customer
  const customerNotification = await notificationService.create({
    CustomerId: data.customerId,
    UserType: 'customer',
    Title: 'notifications.statusChanged',
    Message: `${data.orderNumber}|status.${data.status}`,
    Type: 'order_status_changed',
    OrderId: data.orderId,
    OrderNumber: data.orderNumber,
  });

  // Notify admin panel
  io.to('admin').emit('order:statusChanged', data);
  io.to('admin').emit('notification:new', adminNotification);
  
  // Notify delivery person if order is assigned
  if (data.deliveryPersonId && deliveryNotification) {
    io.to(`delivery-${data.deliveryPersonId}`).emit('order:statusChanged', data);
    io.to(`delivery-${data.deliveryPersonId}`).emit('notification:new', deliveryNotification);
  }
  
  // Notify the customer
  io.to(`customer-${data.customerId}`).emit('order:statusChanged', data);
  io.to(`customer-${data.customerId}`).emit('notification:new', customerNotification);

  logger.info(`Order status changed event emitted: ${data.orderNumber} - ${data.status}`);
};

/**
 * Emit when order is cancelled
 * Sends to: admin room, delivery-{deliveryPersonId} room (if assigned), customer-{customerId} room
 */
export const emitOrderCancelled = async (data: OrderEventData) => {
  const io = getIO();
  if (!io) {
    logger.error('Socket.io not initialized');
    return;
  }

  // Create notification for admin
  const adminNotification = await notificationService.create({
    UserType: 'admin',
    Title: 'notifications.orderCancelled',
    Message: data.orderNumber,
    Type: 'order_cancelled',
    OrderId: data.orderId,
    OrderNumber: data.orderNumber,
  });

  // Create notification for delivery person if was assigned
  let deliveryNotification;
  if (data.deliveryPersonId) {
    deliveryNotification = await notificationService.create({
      DeliveryPersonId: data.deliveryPersonId,
      UserType: 'delivery',
      Title: 'notifications.orderCancelled',
      Message: data.orderNumber,
      Type: 'order_cancelled',
      OrderId: data.orderId,
      OrderNumber: data.orderNumber,
    });
  }

  // Create notification for customer
  const customerNotification = await notificationService.create({
    CustomerId: data.customerId,
    UserType: 'customer',
    Title: 'notifications.orderCancelled',
    Message: data.orderNumber,
    Type: 'order_cancelled',
    OrderId: data.orderId,
    OrderNumber: data.orderNumber,
  });

  // Notify admin panel
  io.to('admin').emit('order:cancelled', data);
  io.to('admin').emit('notification:new', adminNotification);
  
  // Notify delivery person if order was assigned
  if (data.deliveryPersonId && deliveryNotification) {
    io.to(`delivery-${data.deliveryPersonId}`).emit('order:cancelled', data);
    io.to(`delivery-${data.deliveryPersonId}`).emit('notification:new', deliveryNotification);
  }
  
  // Notify the customer
  io.to(`customer-${data.customerId}`).emit('order:cancelled', data);
  io.to(`customer-${data.customerId}`).emit('notification:new', customerNotification);

  logger.info(`Order cancelled event emitted: ${data.orderNumber}`);
};
