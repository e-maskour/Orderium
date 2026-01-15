import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: [
      'http://localhost:3001', // Client portal
      'http://localhost:3003', // Delivery portal
      'http://localhost:3002', // Admin backoffice
    ],
    credentials: true,
  },
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(EventsGateway.name);

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
    client.emit('connected', {
      message: 'Connected to real-time server',
      socketId: client.id,
    });
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('join-room')
  handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() room: string,
  ) {
    void client.join(room);
    this.logger.log(`Client ${client.id} joined room: ${room}`);
    return { success: true, room };
  }

  @SubscribeMessage('leave-room')
  handleLeaveRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() room: string,
  ) {
    void client.leave(room);
    this.logger.log(`Client ${client.id} left room: ${room}`);
    return { success: true, room };
  }

  // Emit order created event
  emitOrderCreated(order: { Order?: { number?: string } }) {
    this.server.emit('order:created', order);
    this.logger.log(`Order created event emitted: ${order.Order?.number}`);
  }

  // Emit order status updated event
  emitOrderStatusUpdated(orderId: number, status: string) {
    this.server.emit('order:status-updated', { orderId, status });
    this.logger.log(`Order status updated: ${orderId} -> ${status}`);
  }

  // Emit delivery assigned event
  emitDeliveryAssigned(delivery: { deliveryPersonId: number }) {
    this.server
      .to(`delivery-${delivery.deliveryPersonId}`)
      .emit('delivery:assigned', delivery);
    this.logger.log(`Delivery assigned to person ${delivery.deliveryPersonId}`);
  }

  // Emit notification
  emitNotification(userId: number, notification: Record<string, unknown>) {
    this.server.to(`user-${userId}`).emit('notification', notification);
    this.logger.log(`Notification sent to user ${userId}`);
  }
}
