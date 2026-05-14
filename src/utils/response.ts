import { Response } from 'express';

export function sendSuccess(res: Response, data: any, statusCode: number = 200): void {
  res.status(statusCode).json({ success: true, ...data });
}

export function sendCreated(res: Response, data: any, message = 'Created successfully'): void {
  sendSuccess(res, { message, ...data }, 201);
}

export function sendNoContent(res: Response): void {
  res.status(204).send();
}

export function sendError(res: Response, statusCode: number, error: string, details?: any): void {
  res.status(statusCode).json({ success: false, error, ...(details && { details }) });
}
