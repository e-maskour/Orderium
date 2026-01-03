import { Socket } from 'socket.io';
import { logger } from '../utils/logger';

interface SocketData {
  userId?: number;
  userType?: 'admin' | 'delivery' | 'customer';
  deliveryPersonId?: number;
  customerId?: number;
}

export const handleSocketRooms = (socket: Socket) => {
  const socketData = socket.data as SocketData;
  const { userType } = socketData;

  // Join user to appropriate rooms based on their type
  if (userType === 'admin') {
    socket.join('admin');
    logger.info(`Socket ${socket.id} joined admin room`);
  } else if (userType === 'delivery') {
    const deliveryPersonId = socket.handshake.auth.deliveryPersonId;
    if (deliveryPersonId) {
      socket.join(`delivery-${deliveryPersonId}`);
      socketData.deliveryPersonId = deliveryPersonId;
      logger.info(`Socket ${socket.id} joined delivery-${deliveryPersonId} room`);
    }
  } else if (userType === 'customer') {
    const customerId = socket.handshake.auth.customerId;
    if (customerId) {
      socket.join(`customer-${customerId}`);
      socketData.customerId = customerId;
      logger.info(`Socket ${socket.id} joined customer-${customerId} room`);
    }
  }

  // All users join a general 'orders' room for broadcast messages
  socket.join('orders');
};
