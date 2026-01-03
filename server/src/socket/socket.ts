import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { logger } from '../utils/logger';
import { socketAuthMiddleware } from './middleware/socketAuth';
import { handleSocketRooms } from './rooms';

let io: SocketIOServer | null = null;

export const initializeSocket = (httpServer: HTTPServer) => {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: [
        'http://localhost:3001', // Client portal
        'http://localhost:3003', // Delivery portal
        'http://localhost:3002', // Admin backoffice
      ],
      credentials: true,
    },
  });

  // Apply authentication middleware
  io.use(socketAuthMiddleware);

  io.on('connection', (socket) => {
    logger.info(`New socket connection: ${socket.id}`);

    // Join user to appropriate rooms
    handleSocketRooms(socket);

    // Send confirmation to client
    socket.emit('connected', { 
      message: 'Connected to real-time server',
      socketId: socket.id 
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      logger.info(`Socket disconnected: ${socket.id}`);
    });
  });

  logger.info('Socket.io server initialized');
  return io;
};

export const getIO = (): SocketIOServer => {
  if (!io) {
    throw new Error('Socket.io not initialized. Call initializeSocket first.');
  }
  return io;
};
