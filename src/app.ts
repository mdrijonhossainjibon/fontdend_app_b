import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import { env, corsOptions } from '@/config';
import routes from '@/routes';
import { errorHandler } from '@/middlewares/error.middleware';
import { fingerprintMiddleware } from '@/middlewares/fingerprint.middleware';
import logger from '@/utils/logger';

export function createApp(): Express {
  const app: Express = express();

  // ───────────────────────────────────────────────────────────────────────────
  // Security & parsing middleware
  // ───────────────────────────────────────────────────────────────────────────
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' }, contentSecurityPolicy: false }));
  app.use(cors(corsOptions));
  app.use(compression());
  app.use(cookieParser());

  // ───────────────────────────────────────────────────────────────────────────
  // Fingerprint / request signing verification
  // ───────────────────────────────────────────────────────────────────────────
  app.use(fingerprintMiddleware);

  // ───────────────────────────────────────────────────────────────────────────
  // Body parsing — raw body for webhook signatures, JSON/form for everything else
  // ───────────────────────────────────────────────────────────────────────────

// ⚠️ Disabled in favor of the existing handleRawBody approach
// This is now handled in app.ts with a custom middleware

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // ───────────────────────────────────────────────────────────────────────────
  // HTTP request logging
  // ───────────────────────────────────────────────────────────────────────────
  if (env.NODE_ENV !== 'test') {
    app.use(morgan(env.LOG_LEVEL, {
      stream: { write: (msg: string) => logger.info(msg.trim()) },
    }));
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Health check
  // ───────────────────────────────────────────────────────────────────────────
  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString() });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // API routes
  // ───────────────────────────────────────────────────────────────────────────
  app.use('/api', routes);

  // ───────────────────────────────────────────────────────────────────────────
  // 404 handler
  // ───────────────────────────────────────────────────────────────────────────
  app.use((_req: Request, res: Response) => {
    res.status(404).json({ success: false, message: 'Route not found' });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Global error handler (must be last)
  // ───────────────────────────────────────────────────────────────────────────
  app.use(errorHandler);

  return app;
}
