import crypto from 'crypto';
import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import asyncHandler from '@/utils/asyncHandler';
import { ApiError } from '@/utils/ApiError';
import { sendSuccess } from '@/utils/response';
import { connectDB } from '@/config';
import { User } from '@/models/User';
import { UserPackage } from '@/models/UserPackage';
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

  // Admin (not superadmin) can only see 'user' and 'admin' roles
  const requesterRole = (req as any).user?.role;
  if (requesterRole === 'admin') {
    if (role && ['user', 'admin'].includes(role)) {
      query.role = role;
    } else {
      query.role = { $in: ['user', 'admin'] };
    }
  } else if (role) {
    query.role = role;
  }

  if (search) {
    query.$or = [{ name: { $regex: search, $options: 'i' } }, { email: { $regex: search, $options: 'i' } }];
  }
  if (status === 'active') query.status = 'active';
  else if (status === 'inactive') query.status = 'inactive';

  const [users, total] = await Promise.all([
    User.find(query).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).select('-password'),
    User.countDocuments(query),
  ]);

  sendSuccess(res, {
    users,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasNextPage: page < Math.ceil(total / limit),
      hasPrevPage: page > 1,
    },
  });
});

export const getById = asyncHandler(async (req: Request, res: Response) => {
  await connectDB();
  const user = await User.findById(req.params.id).select('-password');
  if (!user) throw new ApiError(404, 'User not found');

  const packages = await UserPackage.find({ userId: user._id, status: { $ne: 'cancelled' } }).lean();

  sendSuccess(res, { user, packages });
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  await connectDB();
  const { name, email, role, status, balance, password, twoFactorEnabled } = req.body;
  const updateData: Record<string, unknown> = {};
  if (name !== undefined) updateData.name = name;
  if (email !== undefined) updateData.email = email.toLowerCase();
  if (role !== undefined) {
    const requesterRole = (req as any).user?.role;
    if (requesterRole === 'admin' && !['user', 'admin'].includes(role)) {
      throw new ApiError(403, 'Admins can only assign user or admin roles');
    }
    updateData.role = role;
  }
  if (status !== undefined) updateData.status = status;
  if (balance !== undefined) updateData.balance = balance;
  if (password !== undefined && password) updateData.password = await bcrypt.hash(password, 12);
  if (twoFactorEnabled !== undefined) updateData.twoFactorEnabled = twoFactorEnabled;

  const user = await User.findByIdAndUpdate(req.params.id, { $set: updateData }, { new: true }).select('-password');
  if (!user) throw new ApiError(404, 'User not found');

  await logActivity({ userId: (req as any).user._id, action: 'User Updated', resource: 'user', description: `Updated user: ${user.email}`, ip: getClientIp(req) });
  sendSuccess(res, { message: 'User updated successfully', user });
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  await connectDB();
  const user = await User.findByIdAndDelete(req.params.id);
  if (!user) throw new ApiError(404, 'User not found');

  await UserPackage.deleteMany({ userId: user._id });
  await Activity.deleteMany({ userId: user._id });
  await ApiKey.deleteMany({ userId: user._id });

  await logActivity({ userId: (req as any).user._id, action: 'User Deleted', resource: 'user', description: `Deleted user: ${user.email}`, ip: getClientIp(req) });
  sendSuccess(res, { message: 'User deleted successfully' });
});

export const toggleActive = asyncHandler(async (req: Request, res: Response) => {
  await connectDB();
  const user = await User.findById(req.params.id);
  if (!user) throw new ApiError(404, 'User not found');
  user.status = user.status === 'active' ? 'inactive' : 'active';
  await user.save();

  const action = user.status === 'active' ? 'Enabled' : 'Disabled';
  await logActivity({ userId: (req as any).user._id, action: `User ${action}`, resource: 'user', description: `${action} user: ${user.email}`, ip: getClientIp(req) });
  sendSuccess(res, { message: `User ${action.toLowerCase()} successfully`, status: user.status });
});

// ─── API Key Management (Admin) ────────────────────────────

export const getUserApiKeys = asyncHandler(async (req: Request, res: Response) => {
  await connectDB();
  const { id } = req.params;

  const user = await User.findById(id);
  if (!user) throw new ApiError(404, 'User not found');

  const keys = await ApiKey.find({ userId: id, status: 'active' }).sort({ createdAt: 1 }).lean();
  const formattedKeys = keys.map((k: any, i: number) => ({
    id: k._id,
    name: i === 0 ? 'Master Key' : k.name,
    key: k.key ? k.key.substring(0, 16) + '...' : '',
    fullKey: k.key,
    status: k.status,
    isMaster: i === 0,
    lastUsed: k.lastUsed || null,
    usageCount: k.usageCount || 0,
    createdAt: k.createdAt,
    updatedAt: k.updatedAt,
  }));

  sendSuccess(res, { apiKeys: formattedKeys });
});

export const createUserApiKey = asyncHandler(async (req: Request, res: Response) => {
  await connectDB();
  const { id } = req.params;
  const { name } = req.body;

  if (!name) throw new ApiError(400, 'Key name is required');

  const user = await User.findById(id);
  if (!user) throw new ApiError(404, 'User not found');

  const count = await ApiKey.countDocuments({ userId: id, status: 'active' });
  if (count >= 10) throw new ApiError(400, 'User already has maximum number of API keys (10)');

  const rawKey = 'pk_live_' + crypto.randomBytes(24).toString('hex');
  const displayKey = rawKey.substring(0, 16) + '...';

  const apiKey = await ApiKey.create({
    userId: id,
    name,
    key: rawKey,
    prefix: 'pk_live',
    status: 'active',
  });

  await logActivity({ userId: (req as any).user._id, action: 'API Key Generated (Admin)', resource: 'apiKey', description: `Admin generated API key "${name}" for user ${user.email}`, ip: getClientIp(req) });

  sendSuccess(res, {
    apiKey: {
      id: apiKey._id,
      name: apiKey.name,
      key: displayKey,
      fullKey: rawKey,
      status: apiKey.status,
      isMaster: false,
      lastUsed: null,
      usageCount: 0,
      createdAt: apiKey.createdAt,
    },
  });
});

export const deleteUserApiKey = asyncHandler(async (req: Request, res: Response) => {
  await connectDB();
  const { id, keyId } = req.params;

  const user = await User.findById(id);
  if (!user) throw new ApiError(404, 'User not found');

  const apiKey = await ApiKey.findOne({ _id: keyId, userId: id });
  if (!apiKey) throw new ApiError(404, 'API key not found');

  await ApiKey.deleteOne({ _id: keyId });

  await logActivity({ userId: (req as any).user._id, action: 'API Key Deleted (Admin)', resource: 'apiKey', description: `Admin deleted API key "${apiKey.name}" for user ${user.email}`, ip: getClientIp(req) });

  sendSuccess(res, { message: 'API key deleted successfully' });
});

export const regenerateUserApiKey = asyncHandler(async (req: Request, res: Response) => {
  await connectDB();
  const { id, keyId } = req.params;

  const user = await User.findById(id);
  if (!user) throw new ApiError(404, 'User not found');

  const apiKey = await ApiKey.findOne({ _id: keyId, userId: id });
  if (!apiKey) throw new ApiError(404, 'API key not found');

  const rawKey = 'pk_live_' + crypto.randomBytes(24).toString('hex');
  const displayKey = rawKey.substring(0, 16) + '...';

  apiKey.key = rawKey;
  apiKey.lastUsed = null as any;
  apiKey.usageCount = 0;
  await apiKey.save();

  await logActivity({ userId: (req as any).user._id, action: 'API Key Regenerated (Admin)', resource: 'apiKey', description: `Admin regenerated API key "${apiKey.name}" for user ${user.email}`, ip: getClientIp(req) });

  sendSuccess(res, {
    apiKey: {
      id: apiKey._id,
      name: apiKey.name,
      key: displayKey,
      fullKey: rawKey,
      status: apiKey.status,
      isMaster: false,
      lastUsed: null,
      usageCount: 0,
      createdAt: apiKey.createdAt,
    },
  });
});
