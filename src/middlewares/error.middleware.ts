import { Request, Response, NextFunction } from 'express';
import { ApiError } from '@/utils/ApiError';
import logger from '@/utils/logger';

const isDev = process.env.NODE_ENV !== 'production';

export const errorHandler = (err: Error, req: Request, res: Response, _next: NextFunction): void => {
  logger.error(`${err.message}`, {
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    stack: err.stack,
  });

  if (err instanceof ApiError) {
    res.status(err.statusCode).json({
      success: false,
      error: err.message,
      code: err.statusCode,
    });
    return;
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    res.status(400).json({
      success: false,
      error: 'Validation Error',
      details: (err as any).errors
        ? Object.values((err as any).errors).map((e: any) => ({ field: e.path, message: e.message }))
        : undefined,
    });
    return;
  }

  // Mongoose duplicate key
  if ((err as any).code === 11000) {
    res.status(409).json({
      success: false,
      error: 'Duplicate key error',
      details: (err as any).keyValue,
    });
    return;
  }

  // Default
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    ...(isDev && { detail: err.message }),
  });
};
