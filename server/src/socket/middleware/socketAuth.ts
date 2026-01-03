import { Socket } from 'socket.io';
import { logger } from '../../utils/logger';

interface SocketData {
  userId?: number;
  userType?: 'admin' | 'delivery' | 'customer';
  deliveryPersonId?: number;
  customerId?: number;
}

export const socketAuthMiddleware = async (
  socket: Socket,
  next: (err?: Error) => void
) => {
  try {
    const token = socket.handshake.auth.token;
    const userType = socket.handshake.auth.userType; // 'admin', 'delivery', or 'customer'

    if (!token || !userType) {
      logger.warn(`Socket authentication failed: Missing token or userType`);
      return next(new Error('Authentication error: Missing credentials'));
    }

    // Store user data in socket
    const socketData = socket.data as SocketData;
    socketData.userType = userType;

    // For now, we'll accept the token as-is
    // In production, you should verify JWT token here
    // const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    logger.info(`Socket authenticated: ${socket.id} as ${userType}`);
    next();
  } catch (error) {
    logger.error('Socket authentication error:', error);
    next(new Error('Authentication error'));
  }
};
