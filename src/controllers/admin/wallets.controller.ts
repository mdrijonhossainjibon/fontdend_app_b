import { Request, Response } from 'express';
import asyncHandler from '@/utils/asyncHandler';
import { ApiError } from '@/utils/ApiError';
import { sendSuccess } from '@/utils/response';
import { connectDB } from '@/config';
import { User } from '@/models/User';

export const list = asyncHandler(async (req: Request, res: Response) => {
  await connectDB();
  const users = await User.find({}).select('name email balance role status createdAt');
  const totalBalance = users.reduce((sum: number, u: any) => sum + (u.balance || 0), 0);
  sendSuccess(res, { wallets: users, totalBalance });
});

export const updateBalance = asyncHandler(async (req: Request, res: Response) => {
  await connectDB();
  const { balance } = req.body;
  if (balance === undefined || balance === null) throw new ApiError(400, 'Balance is required');

  const user = await User.findByIdAndUpdate(req.params.id, { $set: { balance } }, { new: true });
  if (!user) throw new ApiError(404, 'User not found');
  sendSuccess(res, { message: 'Balance updated successfully', user: { id: user._id, email: user.email, balance: user.balance } });
});
