import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import { env, corsOptions } from '@/config';
import routes from '@/routes';
import { errorHandler } from '@/middlewares/error.middleware';
import { authMiddleware as fingerprintAuth } from 'auth-fingerprint';
import logger from '@/utils/logger';

import path from 'path';

export function createApp(): Express {
  const app: Express = express();
  app.set('etag', false); // Disable etag to prevent 304 Not Modified cache

  // Serve static files from public directory
  const publicPath = path.resolve(process.cwd(), 'public');
  app.use('/public', express.static(publicPath));
  // Also allow direct access without /public prefix if preferred, but /public is safer
  app.use(express.static(publicPath));
  console.log('Serving static files from:', publicPath);

  // ───────────────────────────────────────────────────────────────────────────
  // Security & parsing middleware
  // ───────────────────────────────────────────────────────────────────────────
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' }, contentSecurityPolicy: false }));
  app.use(cors(corsOptions));
  // @ts-ignore
  app.use(compression());
  app.use(cookieParser());

  // ───────────────────────────────────────────────────────────────────────────
  // Fingerprint / request signing verification
  // ───────────────────────────────────────────────────────────────────────────
  // auth-fingerprint middleware — skip routes that must be publicly accessible
  app.use((req, res, next) => {
    const skipPaths = [
      '/api/admin/upload-model',
      '/api/auth/forgot-password',
      '/api/auth/reset-password',
      '/api/auth/reset-password/verify',
    ];
    if (skipPaths.some(p => req.path.startsWith(p))) return next();
    (fingerprintAuth('signature', env.AUTH_FINGERPRINT_SECRET) as any)(req, res, next);
  });

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
