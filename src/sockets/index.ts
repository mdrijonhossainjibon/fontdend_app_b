import { Server as HttpServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import logger from '@/utils/logger';

let io: SocketServer | null = null;
const onlineUsers = new Map<string, { userId: string; connectedAt: Date }>();
let analyticsInterval: ReturnType<typeof setInterval> | null = null;

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

/**
 * Emit analytics update trigger to all connected admin users.
 * Client uses its own current filter selection; no days override sent.
 */
export function emitAdminAnalyticsUpdate(): void {
  if (!io) return;
  io.to('admin').emit('admin:analytics-update');
}

function startAnalyticsInterval() {
  if (analyticsInterval) return;
  analyticsInterval = setInterval(() => {
    if (!io) return;
    const adminRoom = io.sockets.adapter.rooms.get('admin');
    if (adminRoom && adminRoom.size > 0) {
      emitAdminAnalyticsUpdate();
    }
  }, 30000);
}

function stopAnalyticsInterval() {
  if (analyticsInterval) {
    clearInterval(analyticsInterval);
    analyticsInterval = null;
  }
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
    const role = socket.handshake.query.role as string;
    logger.info(`Socket connected: ${socket.id}${userId ? ` (user: ${userId})` : ''}`);

    if (userId) {
      onlineUsers.set(socket.id, { userId, connectedAt: new Date() });
      io?.emit('users:online', { count: onlineUsers.size });
      // Auto-join user to their personal room for targeted events
      socket.join(`user:${userId}`);

      // Auto-join admin room for admin users
      if (['admin', 'superadmin'].includes(role)) {
        socket.join('admin');
        startAnalyticsInterval();
      }
    }

    socket.on('disconnect', () => {
      onlineUsers.delete(socket.id);
      io?.emit('users:online', { count: onlineUsers.size });
      logger.info(`Socket disconnected: ${socket.id}`);

      // Stop interval if no more admin users
      const adminRoom = io?.sockets.adapter.rooms.get('admin');
      if (!adminRoom || adminRoom.size === 0) {
        stopAnalyticsInterval();
      }
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
