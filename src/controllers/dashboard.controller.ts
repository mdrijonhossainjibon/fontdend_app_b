import { Request, Response } from 'express';
import asyncHandler from '@/utils/asyncHandler';
import { ApiError } from '@/utils/ApiError';
import { sendSuccess } from '@/utils/response';
import { User } from '@/models/User';
import { ApiKey } from '@/models/ApiKey';
import { Activity } from '@/models/Activity';
import { UserPackage } from '@/models/UserPackage';
import { logActivity } from '@/services/activity';
import { emitDashboardUpdate } from '@/sockets';

const getClientIp = (req: Request): string =>
  req.header('x-forwarded-for')?.split(',')[0] || req.header('x-real-ip') || req.ip || '127.0.0.1';

function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`;
  return new Date(date).toLocaleDateString();
}

// ─────────────────────────────────────────────────────────────────────────────
// API Keys
// ─────────────────────────────────────────────────────────────────────────────
export const getApiKeys = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user._id;

  const apiKeys = await ApiKey.find({ userId, isActive: true }).sort({ createdAt: 1 });
  const formattedKeys = apiKeys.map((key: any) => ({
    id: key._id, name: key.name, key: key.key, fullKey: key.key,
    status: key.status, lastUsed: key.lastUsed ? formatTimeAgo(key.lastUsed) : 'Never',
    usageCount: key.usageCount, createdAt: key.createdAt,
  }));

  const slots = [];
  for (let i = 0; i < 3; i++) {
    if (formattedKeys[i]) {
      const isMaster = i === 0;
      slots.push({ ...formattedKeys[i], name: isMaster && formattedKeys[i].name !== 'Master Key' ? 'Master Key' : formattedKeys[i].name, isMaster });
    } else {
      slots.push({ name: `Slot ${i + 1}`, key: '', status: 'empty', lastUsed: '', isMaster: i === 0 });
    }
  }

  sendSuccess(res, { apiKeys: slots });
});

export const createApiKey = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user._id;
  const { name } = req.body;

  if (!name) throw new ApiError(400, 'Name is required');

  const count = await ApiKey.countDocuments({ userId, isActive: true });
  if (count >= 3) throw new ApiError(400, 'Maximum 3 API keys allowed');

  const newKey = `pk_live_${Buffer.from(Math.random().toString(36).substring(2) + Date.now().toString(36)).toString('hex').substring(0, 24)}`;
  const apiKey = await ApiKey.create({ userId, name, key: newKey, prefix: 'pk_live', isActive: true });

  await logActivity({ userId: userId.toString(), action: 'API Key Generated', resource: 'api_key', description: `Created new API key: ${name}`, ip: getClientIp(req) });

  emitDashboardUpdate(userId.toString(), { type: 'api-keys' });

  sendSuccess(res, {
    message: 'API key created successfully',
    apiKey: { id: apiKey._id, name: apiKey.name, key: `${newKey.substring(0, 20)}...${newKey.substring(newKey.length - 6)}`, fullKey: newKey, status: apiKey.status, lastUsed: 'Never', createdAt: apiKey.createdAt },
  });
});

export const deleteApiKey = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user._id;
  const id = req.body?.id || req.query?.id;

  if (!id) throw new ApiError(400, 'Key ID is required');

  const keyToDelete = await ApiKey.findOne({ _id: id, userId });
  if (!keyToDelete) throw new ApiError(404, 'API key not found');

  const oldestKey = await ApiKey.findOne({ userId, isActive: true }).sort({ createdAt: 1 });
  if (oldestKey && oldestKey._id.toString() === keyToDelete._id.toString())
    throw new ApiError(400, 'Cannot delete the Master Key');

  await ApiKey.deleteOne({ _id: id });
  await logActivity({ userId: userId.toString(), action: 'API Key Deleted', resource: 'api_key', description: `Deleted API key: ${keyToDelete.name}`, ip: getClientIp(req) });

  emitDashboardUpdate(userId.toString(), { type: 'api-keys' });

  sendSuccess(res, { message: 'API key deleted successfully' });
});

export const regenerateApiKey = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user._id;
  const { id } = req.params;

  if (!id) throw new ApiError(400, 'Key ID is required');

  const apiKey = await ApiKey.findOne({ _id: id, userId });
  if (!apiKey) throw new ApiError(404, 'API key not found');

  const newKey = `pk_live_${Buffer.from(Math.random().toString(36).substring(2) + Date.now().toString(36)).toString('hex').substring(0, 24)}`;
  apiKey.key = newKey;
  apiKey.lastUsed = undefined;
  apiKey.usageCount = 0;
  await apiKey.save();

  await logActivity({ userId: userId.toString(), action: 'API Key Regenerated', resource: 'api_key', description: `Regenerated API key: ${apiKey.name}`, ip: getClientIp(req) });

  emitDashboardUpdate(userId.toString(), { type: 'api-keys' });

  sendSuccess(res, {
    message: 'API key regenerated successfully',
    apiKey: {
      id: apiKey._id, name: apiKey.name, key: `${newKey.substring(0, 20)}...${newKey.substring(newKey.length - 6)}`,
      fullKey: newKey, status: apiKey.status, lastUsed: 'Never', createdAt: apiKey.createdAt,
    },
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// UserPackages
// ─────────────────────────────────────────────────────────────────────────────
export const getUserPackages = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user._id;
  const packages = await UserPackage.find({ userId }).sort({ createdAt: -1 });
  sendSuccess(res, {
    packages: packages.map((pkg: any) => ({
      id: pkg._id,
      type: pkg.type,
      name: pkg.name,
      price: pkg.price,
      billingCycle: pkg.billingCycle,
      credits: pkg.credits,
      creditsUsed: pkg.creditsUsed,
      creditsRemaining: pkg.creditsRemaining,
      features: pkg.features,
      status: pkg.status,
      autoRenew: pkg.autoRenew,
      startDate: pkg.startDate,
      endDate: pkg.endDate,
      refill: pkg.refill,
      dailyLimitUsed: pkg.dailyLimitUsed,
      packageCode: pkg.packageCode,
    })),
  });
});

export const updateUserPackageAutoRenew = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user._id;
  const { autoRenew } = req.body;

  if (typeof autoRenew !== 'boolean') throw new ApiError(400, 'autoRenew must be a boolean');

  const activeUserPackage = await UserPackage.findOne({ userId, status: 'active', endDate: { $gt: new Date() } });
  if (!activeUserPackage) throw new ApiError(404, 'No active package found');

  activeUserPackage.autoRenew = autoRenew;
  await activeUserPackage.save();

  emitDashboardUpdate(userId.toString(), { type: 'package' });

  sendSuccess(res, { message: `Auto-renew ${autoRenew ? 'enabled' : 'disabled'}`, autoRenew: activeUserPackage.autoRenew });
});

export const cancelUserPackage = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user._id;

  const activeUserPackage = await UserPackage.findOneAndUpdate(
    { userId, status: 'active', endDate: { $gt: new Date() } },
    { status: 'cancelled', autoRenew: false },
    { new: true }
  );
  if (!activeUserPackage) throw new ApiError(404, 'No active package found');

  emitDashboardUpdate(userId.toString(), { type: 'package' });

  sendSuccess(res, { message: 'UserPackage cancelled successfully' });
});

// ─────────────────────────────────────────────────────────────────────────────
// Activity
// ─────────────────────────────────────────────────────────────────────────────
export const getActivity = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user._id;

  

  const activities = await Activity.find({ userId }).sort({ createdAt: -1 }).limit(50);
 
  sendSuccess(res, {
    activities: activities.map((a: any) => ({
      id: a._id.toString(), action: a.action, type: a.type, description: a.description,
      ip: a.ip, location: a.location, status: a.status,
      timestamp: a.createdAt.toISOString().replace(/T/, ' ').replace(/\..+/, ''),
    })),
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Stats
// ─────────────────────────────────────────────────────────────────────────────
export const getStats = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user._id;

  const user = await User.findById(userId).select('-password');
  if (!user) throw new ApiError(404, 'User not found');

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const activeUserPackage = await UserPackage.findOne({ userId, status: 'active' });

  const now = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const msUntilReset = tomorrow.getTime() - now.getTime();
  const hoursUntilReset = Math.floor(msUntilReset / (1000 * 60 * 60));
  const minutesUntilReset = Math.floor((msUntilReset % (1000 * 60 * 60)) / (1000 * 60));
  const resetsIn = `${hoursUntilReset}h ${minutesUntilReset}m`;
  const percentage = activeUserPackage ? (activeUserPackage.creditsUsed / activeUserPackage.credits) * 100 : 0;

  sendSuccess(res, {
    user: { id: user._id, name: user.name, email: user.email, credits: user.credits, role: user.role },
    dailyUsage: {
      used: activeUserPackage ? activeUserPackage.creditsUsed : 0,
      total: activeUserPackage ? activeUserPackage.credits : 0,
      percentage: Math.round(percentage * 10) / 10,
      resetsIn: activeUserPackage ? resetsIn : null,
      totalRequests: activeUserPackage ? activeUserPackage.creditsUsed : 0,
      requestsLeft: activeUserPackage ? activeUserPackage.credits - activeUserPackage.creditsUsed : 0,
      type: activeUserPackage ? activeUserPackage.type : null,
    },
    package: activeUserPackage ? {
      id: activeUserPackage._id, code: activeUserPackage.packageCode, name: activeUserPackage.name,
      price: activeUserPackage.price, credits: activeUserPackage.credits, creditsUsed: activeUserPackage.creditsUsed,
      creditsRemaining: activeUserPackage.credits - activeUserPackage.creditsUsed,
      usagePercentage: Math.round(((activeUserPackage.creditsUsed / activeUserPackage.credits) * 100) * 10) / 10,
      features: activeUserPackage.features, autoRenew: activeUserPackage.autoRenew,
      status: activeUserPackage.status, endDate: activeUserPackage.endDate,
    } : null,
  });
});
