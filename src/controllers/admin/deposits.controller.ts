import { Request, Response } from 'express';
import asyncHandler from '@/utils/asyncHandler';
import { ApiError } from '@/utils/ApiError';
import { sendSuccess } from '@/utils/response';
import { connectDB } from '@/config';
import { Deposit } from '@/models/Deposit';
import { User } from '@/models/User';

export const list = asyncHandler(async (req: Request, res: Response) => {
  await connectDB();
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const status = req.query.status as string;

  const query: Record<string, unknown> = {};
  if (status) query.status = status;

  const [deposits, total] = await Promise.all([
    Deposit.find(query).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    Deposit.countDocuments(query),
  ]);

  sendSuccess(res, { deposits, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
});

export const approve = asyncHandler(async (req: Request, res: Response) => {
  await connectDB();
  const deposit = await Deposit.findByIdAndUpdate(req.params.id, { $set: { status: 'completed' } }, { new: true });
  if (!deposit) throw new ApiError(404, 'Deposit not found');

  if (deposit.userId) {
    await User.findByIdAndUpdate(deposit.userId, { $inc: { balance: deposit.amountUSD || deposit.amount } });
  }

  sendSuccess(res, { message: 'Deposit marked as completed and balance updated', deposit });
});

export const reject = asyncHandler(async (req: Request, res: Response) => {
  await connectDB();
  const deposit = await Deposit.findByIdAndUpdate(req.params.id, { $set: { status: 'failed' } }, { new: true });
  if (!deposit) throw new ApiError(404, 'Deposit not found');
  sendSuccess(res, { message: 'Deposit marked as failed', deposit });
});
