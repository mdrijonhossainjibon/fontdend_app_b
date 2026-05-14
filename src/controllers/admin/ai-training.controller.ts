import { Request, Response } from 'express';
import asyncHandler from '@/utils/asyncHandler';
import { sendSuccess } from '@/utils/response';
import { connectDB } from '@/config';

export const list = asyncHandler(async (req: Request, res: Response) => {
  await connectDB();
  sendSuccess(res, { aiTrainings: [], total: 0 });
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  await connectDB();
  sendSuccess(res, { message: 'AI Training created', data: req.body }, 201);
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  await connectDB();
  sendSuccess(res, { message: 'AI Training updated', data: req.body });
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  await connectDB();
  sendSuccess(res, { message: 'AI Training deleted' });
});
