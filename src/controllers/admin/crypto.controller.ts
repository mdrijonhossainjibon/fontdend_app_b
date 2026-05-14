import { Request, Response } from 'express';
import asyncHandler from '@/utils/asyncHandler';
import { ApiError } from '@/utils/ApiError';
import { sendSuccess } from '@/utils/response';
import { connectDB } from '@/config';
import { CryptoConfig } from '@/models/CryptoConfig';
import { DepositAddress } from '@/models/DepositAddress';
import { Deposit } from '@/models/Deposit';
import { User } from '@/models/User';

export const getConfigs = asyncHandler(async (req: Request, res: Response) => {
  await connectDB();
  const configs = await CryptoConfig.find().sort({ id: 1 }).lean();
  sendSuccess(res, { cryptoConfigs: configs });
});

export const updateConfig = asyncHandler(async (req: Request, res: Response) => {
  await connectDB();
  const config = await CryptoConfig.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true });
  if (!config) throw new ApiError(404, 'Crypto config not found');
  sendSuccess(res, { message: 'Crypto config updated', data: config });
});

export const getAllDeposits = asyncHandler(async (req: Request, res: Response) => {
  await connectDB();
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const status = req.query.status as string;

  const query: Record<string, unknown> = {};
  if (status) query.status = status;

  const [deposits, total] = await Promise.all([
    Deposit.find(query).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).populate('userId', 'email name').lean(),
    Deposit.countDocuments(query),
  ]);

  sendSuccess(res, { deposits, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
});
