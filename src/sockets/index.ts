import { Server as HttpServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import logger from '@/utils/logger';

let io: SocketServer | null = null;
const onlineUsers = new Map<string, { userId: string; connectedAt: Date }>();

export function getIO(): SocketServer | null {
  return io;
}

export function getOnlineUsers(): number {
  return onlineUsers.size;
}

/**
 * Emit a dashboard update event to a specific user's room.
 */
export function emitDashboardEvent(userId: string, event: string, data: any): void {
  if (!io) return;
  io.to(`user:${userId}`).emit(event, data);
}

/**
 * Emit a general dashboard:update event (triggers full refresh on frontend).
 */
export function emitDashboardUpdate(userId: string, data: any): void {
  emitDashboardEvent(userId, 'dashboard:update', data);
}

export function initializeSocket(httpServer: HttpServer): SocketServer {
  io = new SocketServer(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || '*',
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingInterval: 25000,
    pingTimeout: 20000,
  });

  io.on('connection', (socket) => {
    const userId = socket.handshake.query.userId as string;
    logger.info(`Socket connected: ${socket.id}${userId ? ` (user: ${userId})` : ''}`);

    if (userId) {
      onlineUsers.set(socket.id, { userId, connectedAt: new Date() });
      io?.emit('users:online', { count: onlineUsers.size });
      // Auto-join user to their personal room for targeted events
      socket.join(`user:${userId}`);
    }

    socket.on('disconnect', () => {
      onlineUsers.delete(socket.id);
      io?.emit('users:online', { count: onlineUsers.size });
      logger.info(`Socket disconnected: ${socket.id}`);
    });

    socket.on('join:room', (room: string) => {
      socket.join(room);
    });

    socket.on('leave:room', (room: string) => {
      socket.leave(room);
    });
  });

  logger.info('Socket.IO initialized');
  return io;
}
