import http from 'http';
import { createApp } from './app';
import { connectDB } from './config';
import { initializeSocket } from './sockets';
import { initJobs } from './jobs';
import logger from './utils/logger';

async function bootstrap(): Promise<void> {
  await connectDB();

  const app = createApp();
  const httpServer = http.createServer(app);

  initializeSocket(httpServer);

  const PORT = parseInt(process.env.PORT || '3000', 10);
  const HOST = process.env.HOST || '0.0.0.0';

  httpServer.listen(PORT, HOST, () => {
    logger.info(`Server running on http://${HOST}:${PORT}`);
    logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
  });

  initJobs();

  const shutdown = (signal: string) => {
    logger.info(`${signal} received — shutting down gracefully`);
    httpServer.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 10000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

bootstrap().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
