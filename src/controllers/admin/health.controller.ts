import { Request, Response } from 'express';
import asyncHandler from '@/utils/asyncHandler';
import { sendSuccess } from '@/utils/response';
import mongoose from 'mongoose';

export const check = asyncHandler(async (req: Request, res: Response) => {
  const state = mongoose.connection.readyState;
  const states: Record<number, string> = { 0: 'disconnected', 1: 'connected', 2: 'connecting', 3: 'disconnecting' };

  sendSuccess(res, {
    status: states[state] || 'unknown',
    database: mongoose.connection.db?.databaseName || null,
    host: mongoose.connection.host || null,
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    timestamp: new Date().toISOString(),
  });
});
