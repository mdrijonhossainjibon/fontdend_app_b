import crypto from 'crypto';
import { Request, Response } from 'express';
import asyncHandler from '@/utils/asyncHandler';
import { ApiError } from '@/utils/ApiError';
import { sendSuccess, sendError } from '@/utils/response';
import { connectDB } from '@/config';
import { User } from '@/models/User';
import { PricingPlan } from '@/models/PricingPlan';
import { ResellerCustomer } from '@/models/ResellerCustomer';
import { ResellerApiKey } from '@/models/ResellerApiKey';

const generateApiKeyValue = (): string => {
  return 'rk_live_' + crypto.randomBytes(32).toString('hex');
};

// ─────────────────────────────────────────────────────────────────────────────
// Dashboard Stats
// ─────────────────────────────────────────────────────────────────────────────
export const getDashboardStats = asyncHandler(async (req: Request, res: Response) => {
  await connectDB();
  const userId = (req as any).user._id;

  const customers = await ResellerCustomer.find({ resellerId: userId }).lean();
  const apiKeys = await ResellerApiKey.find({ resellerId: userId }).lean();

  const totalCustomers = customers.length;
  const activeCustomers = customers.filter(c => c.status === 'active').length;
  const totalKeys = apiKeys.length;
  const activeKeys = apiKeys.filter(k => k.status === 'active').length;
  const totalCredits = customers.reduce((sum, c) => sum + c.credits, 0);
  const totalUsed = customers.reduce((sum, c) => sum + c.creditsUsed, 0);

  sendSuccess(res, {
    stats: {
      totalCustomers,
      activeCustomers,
      totalApiKeys: totalKeys,
      activeApiKeys: activeKeys,
      totalCredits,
      totalUsed,
      usagePercentage: totalCredits > 0 ? Math.round((totalUsed / totalCredits) * 100 * 10) / 10 : 0,
    },
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Packages (customer list — unified model)
// ─────────────────────────────────────────────────────────────────────────────
export const getPackages = asyncHandler(async (req: Request, res: Response) => {
  await connectDB();
  const userId = (req as any).user._id;
  console.log('getPackages - userId:', userId);

  const customers = await ResellerCustomer.find({ resellerId: userId }).sort({ createdAt: -1 }).lean();
  console.log('getPackages - customers found:', customers.length);

  sendSuccess(res, { packages: customers });
});

// ─────────────────────────────────────────────────────────────────────────────
// API Keys (standalone ResellerApiKey model)
// ─────────────────────────────────────────────────────────────────────────────
export const getApiKeys = asyncHandler(async (req: Request, res: Response) => {
  await connectDB();
  const userId = (req as any).user._id;

  const apiKeys = await ResellerApiKey.find({ resellerId: userId }).sort({ createdAt: -1 }).lean();

  sendSuccess(res, { apiKeys });
});

export const createApiKey = asyncHandler(async (req: Request, res: Response) => {
  await connectDB();
  const userId = (req as any).user._id;
  const { name } = req.body;

  if (!name || !name.trim()) throw new ApiError(400, 'Name is required');

  const apiKey = await ResellerApiKey.create({
    resellerId: userId,
    name: name.trim(),
  });

  sendSuccess(res, {
    apiKey: {
      _id: apiKey._id,
      name: apiKey.name,
      key: apiKey.key,
      prefix: apiKey.prefix,
      status: apiKey.status,
      usageCount: apiKey.usageCount,
      createdAt: apiKey.createdAt,
    },
  });
});

export const deleteApiKey = asyncHandler(async (req: Request, res: Response) => {
  await connectDB();
  const userId = (req as any).user._id;
  const { id } = req.params;

  const deleted = await ResellerApiKey.findOneAndDelete({ _id: id, resellerId: userId });
  if (!deleted) throw new ApiError(404, 'API key not found');

  sendSuccess(res, { message: 'API key deleted successfully' });
});

export const regenerateApiKey = asyncHandler(async (req: Request, res: Response) => {
  await connectDB();
  const userId = (req as any).user._id;
  const { id } = req.params;

  const apiKey = await ResellerApiKey.findOne({ _id: id, resellerId: userId });
  if (!apiKey) throw new ApiError(404, 'API key not found');

  apiKey.key = generateApiKeyValue();
  await apiKey.save();

  sendSuccess(res, {
    apiKey: {
      _id: apiKey._id,
      name: apiKey.name,
      key: apiKey.key,
      prefix: apiKey.prefix,
    },
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Purchase Package (deduct from balance)
// ─────────────────────────────────────────────────────────────────────────────
export const purchasePackage = asyncHandler(async (req: Request, res: Response) => {
  await connectDB();
  const userId = (req as any).user._id;
  const { planId } = req.params;
  const { customerEmail } = req.body;

  if (!planId) return sendError(res, 400, 'planId is required');

  const plan = await PricingPlan.findById(planId);
  if (!plan) return sendError(res, 404, 'Pricing plan not found');

  const user = await User.findById(userId);
  if (!user) return sendError(res, 404, 'User not found');

  const price = plan.price || 0;
  if (user.balance < price) {
    return sendError(res, 400, `Insufficient balance. Required: $${price}, Available: $${user.balance}`);
  }

  let validityDays = 30;
  switch (plan.validity) {
    case '1 day': validityDays = 1; break;
    case '7 days': validityDays = 7; break;
    case '15 days': validityDays = 15; break;
    case '30 days': validityDays = 30; break;
    case '60 days': validityDays = 60; break;
    case '90 days': validityDays = 90; break;
    case '180 days': validityDays = 180; break;
    case '365 days': validityDays = 365; break;
    default: validityDays = plan.validityDays || 30;
  }

  const count = plan.count || 0;
  const dailyLimit = plan.dailyLimit || 0;

  // Create unified ResellerCustomer record (package + api key in one doc)
  const planName = `${plan.code || ''} ${plan.type.charAt(0).toUpperCase() + plan.type.slice(1)} Package`.trim();
  const customer = await ResellerCustomer.create({
    resellerId: userId,
    customerEmail: (customerEmail || '').trim().toLowerCase(),
    name: `${planName} Key`,
    packageCode: plan.code || plan._id.toString(),
    packageName: planName,
    packageType: count > 0 ? 'count' : 'daily',
    price,
    credits: count || dailyLimit || 0,
    startDate: new Date(),
    endDate: new Date(Date.now() + validityDays * 24 * 60 * 60 * 1000),
    status: 'active',
  });

  // Deduct balance
  user.balance -= price;
  await user.save();

  sendSuccess(res, {
    message: 'Package purchased successfully',
    package: {
      _id: customer._id,
      name: customer.packageName,
      packageCode: customer.packageCode,
      price: customer.price,
      credits: customer.credits,
      creditsUsed: customer.creditsUsed,
      status: customer.status,
      startDate: customer.startDate,
      endDate: customer.endDate,
      createdAt: customer.createdAt,
    },
    apiKey: {
      _id: customer._id,
      name: customer.name,
      key: customer.key,
      prefix: customer.prefix,
    },
    balance: user.balance,
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Get available pricing plans
// ─────────────────────────────────────────────────────────────────────────────
export const getPricingPlans = asyncHandler(async (_req: Request, res: Response) => {
  await connectDB();
  const plans = await PricingPlan.find({ status: 'active' }).sort({ sortOrder: 1 }).lean();
  sendSuccess(res, { plans });
});

// ─────────────────────────────────────────────────────────────────────────────
// Delete Customer Package
// ─────────────────────────────────────────────────────────────────────────────
export const deletePackage = asyncHandler(async (req: Request, res: Response) => {
  await connectDB();
  const userId = (req as any).user._id;
  const { id } = req.params;

  const customer = await ResellerCustomer.findOne({ _id: id, resellerId: userId });
  if (!customer) throw new ApiError(404, 'Customer package not found');
  if (!customer.customerEmail) throw new ApiError(403, 'Only customer packages can be deleted');

  await ResellerCustomer.deleteOne({ _id: id });

  sendSuccess(res, { message: 'Customer package and API key deleted' });
});
