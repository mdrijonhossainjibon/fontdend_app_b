import { Request, Response } from 'express';
import asyncHandler from '@/utils/asyncHandler';
import { ApiError } from '@/utils/ApiError';
import { sendSuccess } from '@/utils/response';
import { connectDB } from '@/config';
import { User } from '@/models/User';

export const list = asyncHandler(async (req: Request, res: Response) => {
  await connectDB();
  const users = await User.find({}).select('name email credits role status createdAt');
  const totalBalance = users.reduce((sum: number, u: any) => sum + (u.credits || 0), 0);
  sendSuccess(res, { wallets: users, totalBalance });
});

export const updateBalance = asyncHandler(async (req: Request, res: Response) => {
  await connectDB();
  const { credits: balance } = req.body;
  if (balance === undefined || balance === null) throw new ApiError(400, 'Balance is required');

  const user = await User.findByIdAndUpdate(req.params.id, { $set: { credits: balance } }, { new: true });
  if (!user) throw new ApiError(404, 'User not found');
  sendSuccess(res, { message: 'Credits updated successfully', user: { id: user._id, email: user.email, credits: user.credits } });
});
