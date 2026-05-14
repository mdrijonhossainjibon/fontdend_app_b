import { Request, Response } from 'express';
import asyncHandler from '@/utils/asyncHandler';
import { ApiError } from '@/utils/ApiError';
import { sendSuccess } from '@/utils/response';
import { User } from '@/models/User';
import { Package } from '@/models/Package';
import { Transaction } from '@/models/Transaction';
import { PromoCode } from '@/models/PromoCode';

// GET /topup/active-package
export const getActivePackage = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user._id;

  const user = await User.findById(userId).select('balance');
  if (!user) throw new ApiError(404, 'User not found');

  const activePackage = await Package.findOne({
    userId,
    status: 'active',
    endDate: { $gt: new Date() }
  });

  sendSuccess(res, {
    balance: user.balance,
    activePackage: activePackage
      ? {
          code: activePackage.packageCode,
          name: activePackage.name,
          credits: activePackage.credits,
          creditsUsed: activePackage.creditsUsed,
        }
      : null,
  });
});

// POST /topup/credits
export const buyCredits = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user._id;
  const { credits, price } = req.body;

  if (!credits || !price) throw new ApiError(400, 'credits and price are required');

  const user = await User.findById(userId);
  if (!user) throw new ApiError(404, 'User not found');
  if (user.balance < price) throw new ApiError(400, 'Insufficient balance');

  const activePackage = await Package.findOne({
    userId,
    status: 'active',
    endDate: { $gt: new Date() }
  });
  if (!activePackage) throw new ApiError(400, 'No active package found');

  user.balance = Math.round((user.balance - price) * 100) / 100;
  activePackage.credits += credits;
  await user.save();
  await activePackage.save();

  const msg = 'Successfully added ' + credits.toLocaleString() + ' credits to your package.';

  await Transaction.create({
    userId,
    type: 'purchase',
    credits,
    amount: price,
    label: credits.toLocaleString() + ' Credits'
  });

  sendSuccess(res, { message: msg });
});

// POST /topup/redeem
export const redeemCode = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user._id;
  const { code } = req.body;

  if (!code || !code.trim()) throw new ApiError(400, 'Code is required');

  

  // Look up promo code in database
  const promo = await PromoCode.findOne({ code  ,  isActive: true });
  if (!promo) throw new ApiError(400, 'Invalid or expired promo code');

  // Check expiry
  if (promo.expiresAt && promo.expiresAt < new Date()) {
    throw new ApiError(400, 'Promo code has expired');
  }

  // Check usage limit
  if (promo.currentUses >= promo.maxUses) {
    throw new ApiError(400, 'Promo code has reached maximum usage');
  }

  // Check if user already redeemed this code
  const alreadyRedeemed = await Transaction.findOne({
    userId,
    type: 'redeem',
    meta: code
  });
  if (alreadyRedeemed) throw new ApiError(400, 'Promo code already redeemed');

  const activePackage = await Package.findOne({
    userId,
    status: 'active',
    endDate: { $gt: new Date() }
  });
  if (!activePackage) throw new ApiError(400, 'No active package found');

  // Add credits
  activePackage.credits += promo.credits;
  await activePackage.save();

  // Increment usage counter
  promo.currentUses += 1;
  await promo.save();

  // Create transaction
  await Transaction.create({
    userId,
    type: 'redeem',
    credits: promo.credits,
    label: 'Promo Code',
    meta: code,
  });

  sendSuccess(res, {
    data: {
      creditsAdded: promo.credits,
      totalCredits: activePackage.credits,
      code ,
    },
  });
});

// GET /topup/history
export const getHistory = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user._id;

  const transactions = await Transaction.find({ userId }).sort({ createdAt: -1 }).lean();

  const now = new Date();
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const purchases = transactions.filter((t) => t.type === 'purchase');
  const redeems = transactions.filter((t) => t.type === 'redeem');

  const totalSpent = purchases.reduce((s, t) => s + (t.amount || 0), 0);
  const totalCreditsAdded = transactions
    .filter((t) => t.credits > 0)
    .reduce((s, t) => s + t.credits, 0);
  const totalCreditsUsed = Math.abs(
    transactions
      .filter((t) => t.credits < 0)
      .reduce((s, t) => s + t.credits, 0)
  );
  const thisMonthSpent = purchases
    .filter((t) => new Date(t.createdAt) >= firstOfMonth)
    .reduce((s, t) => s + (t.amount || 0), 0);

  const stats = {
    totalSpent,
    totalCreditsAdded,
    totalCreditsUsed,
    thisMonthSpent,
    transactionCount: transactions.length,
    redeemCount: redeems.length,
  };

  const formatted = transactions.map((tx) => {
    const d = new Date(tx.createdAt);
    const pad = (n: number) => String(n).padStart(2, '0');
    return {
      id: tx._id,
      type: tx.type,
      credits: tx.credits,
      amount: tx.amount,
      label: tx.label || '',
      meta: tx.meta || '',
      date: d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()),
      time: pad(d.getHours()) + ':' + pad(d.getMinutes()),
    };
  });

  sendSuccess(res, { data: { stats, transactions: formatted } });
});
