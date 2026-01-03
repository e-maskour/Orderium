import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

const SOCKET_URL = 'http://localhost:3000';

interface UseSocketOptions {
  token?: string;
  userType: 'delivery';
  deliveryPersonId?: number;
  autoConnect?: boolean;
}

interface OrderEvent {
  orderId: number;
  orderNumber: string;
  customerId: number;
  deliveryPersonId?: number;
  status?: string;
  timestamp?: Date;
}

export const useSocket = (options: UseSocketOptions) => {
  const { token, userType, deliveryPersonId, autoConnect = true } = options;
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!autoConnect || !token || !deliveryPersonId) {
      return;
    }

    // Initialize socket connection
    const socket = io(SOCKET_URL, {
      auth: {
        token,
        userType,
        deliveryPersonId,
      },
      autoConnect: true,
    });

    socketRef.current = socket;

    // Connection event handlers
    socket.on('connect', () => {
      console.log('Socket connected:', socket.id);
      setIsConnected(true);
      setError(null);
    });

    socket.on('connected', (data) => {
      console.log('Server confirmation:', data);
    });

    socket.on('disconnect', () => {
      console.log('Socket disconnected');
      setIsConnected(false);
    });

    socket.on('connect_error', (err) => {
      console.error('Socket connection error:', err.message);
      setError(err.message);
      setIsConnected(false);
    });

    // Cleanup on unmount
    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [token, userType, deliveryPersonId, autoConnect]);

  // Subscribe to order events
  const onOrderAssigned = (callback: (data: OrderEvent) => void) => {
    socketRef.current?.on('order:assigned', callback);
    return () => {
      socketRef.current?.off('order:assigned', callback);
    };
  };

  const onOrderStatusChanged = (callback: (data: OrderEvent) => void) => {
    socketRef.current?.on('order:statusChanged', callback);
    return () => {
      socketRef.current?.off('order:statusChanged', callback);
    };
  };

  const onOrderCancelled = (callback: (data: OrderEvent) => void) => {
    socketRef.current?.on('order:cancelled', callback);
    return () => {
      socketRef.current?.off('order:cancelled', callback);
    };
  };

  return {
    socket: socketRef.current,
    isConnected,
    error,
    onOrderAssigned,
    onOrderStatusChanged,
    onOrderCancelled,
  };
};
