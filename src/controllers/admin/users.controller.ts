import { Request, Response } from 'express';
import asyncHandler from '@/utils/asyncHandler';
import { ApiError } from '@/utils/ApiError';
import { sendSuccess } from '@/utils/response';
import { connectDB } from '@/config';
import { User } from '@/models/User';
import { Package } from '@/models/Package';
import { Activity } from '@/models/Activity';
import { ApiKey } from '@/models/ApiKey';
import { logActivity } from '@/services/activity';

const getClientIp = (req: Request): string =>
  req.header('x-forwarded-for')?.split(',')[0] || req.header('x-real-ip') || req.ip || '127.0.0.1';

export const list = asyncHandler(async (req: Request, res: Response) => {
  await connectDB();
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const search = req.query.search as string;
  const role = req.query.role as string;
  const status = req.query.status as string;

  const query: Record<string, unknown> = {};
  if (search) {
    query.$or = [{ name: { $regex: search, $options: 'i' } }, { email: { $regex: search, $options: 'i' } }];
  }
  if (role) query.role = role;
  if (status === 'active') query.isActive = true;
  else if (status === 'inactive') query.isActive = false;

  const [users, total] = await Promise.all([
    User.find(query).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).select('-password'),
    User.countDocuments(query),
  ]);

  sendSuccess(res, { users, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
});

export const getById = asyncHandler(async (req: Request, res: Response) => {
  await connectDB();
  const user = await User.findById(req.params.id).select('-password');
  if (!user) throw new ApiError(404, 'User not found');
  sendSuccess(res, { user });
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  await connectDB();
  const { name, email, role, isActive, balance, twoFactorEnabled } = req.body;
  const updateData: Record<string, unknown> = {};
  if (name !== undefined) updateData.name = name;
  if (email !== undefined) updateData.email = email.toLowerCase();
  if (role !== undefined) updateData.role = role;
  if (isActive !== undefined) updateData.isActive = isActive;
  if (balance !== undefined) updateData.balance = balance;
  if (twoFactorEnabled !== undefined) updateData.twoFactorEnabled = twoFactorEnabled;

  const user = await User.findByIdAndUpdate(req.params.id, { $set: updateData }, { new: true }).select('-password');
  if (!user) throw new ApiError(404, 'User not found');

  await logActivity({ userId: (req as any).user._id, action: 'User Updated', type: 'admin', description: `Updated user: ${user.email}`, ip: getClientIp(req) });
  sendSuccess(res, { message: 'User updated successfully', user });
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  await connectDB();
  const user = await User.findByIdAndDelete(req.params.id);
  if (!user) throw new ApiError(404, 'User not found');

  await Package.deleteMany({ userId: user._id });
  await Activity.deleteMany({ userId: user._id });
  await ApiKey.deleteMany({ userId: user._id });

  await logActivity({ userId: (req as any).user._id, action: 'User Deleted', type: 'admin', description: `Deleted user: ${user.email}`, ip: getClientIp(req) });
  sendSuccess(res, { message: 'User deleted successfully' });
});

export const toggleActive = asyncHandler(async (req: Request, res: Response) => {
  await connectDB();
  const user = await User.findById(req.params.id);
  if (!user) throw new ApiError(404, 'User not found');
  user.isActive = !user.isActive;
  await user.save();

  const action = user.isActive ? 'Enabled' : 'Disabled';
  await logActivity({ userId: (req as any).user._id, action: `User ${action}`, type: 'admin', description: `${action} user: ${user.email}`, ip: getClientIp(req) });
  sendSuccess(res, { message: `User ${action.toLowerCase()} successfully`, isActive: user.isActive });
});
