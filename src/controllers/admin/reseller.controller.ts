import { Request, Response } from 'express';
import asyncHandler from '@/utils/asyncHandler';
import { sendSuccess } from '@/utils/response';
import { connectDB } from '@/config';
import { User } from '@/models/User';
import { ResellerApiKey } from '@/models/ResellerApiKey';
import { PromoCode } from '@/models/PromoCode';

// ─────────────────────────────────────────────────────────────
// List all resellers
// ─────────────────────────────────────────────────────────────
export const listResellers = asyncHandler(async (_req: Request, res: Response) => {
  await connectDB();

  const resellers = await User.find({ role: 'reseller' })
    .select('-password')
    .sort({ createdAt: -1 })
    .lean();

  // Get stats for each reseller
  const data = await Promise.all(
    resellers.map(async (r) => {
      const apiKeys = await ResellerApiKey.find({ resellerId: r._id }).lean();
      const coupons = await PromoCode.find({
        code: { $regex: `^ADV${r._id.toString().slice(-4).toUpperCase()}` },
      })
        .sort({ createdAt: -1 })
        .lean();

      return {
        _id: r._id,
        name: r.name,
        email: r.email,
        avatar: (r as any).avatar,
        balance: r.balance,
        status: r.status,
        createdAt: r.createdAt,
        stats: {
          totalApiKeys: apiKeys.length,
          activeApiKeys: apiKeys.filter((k: any) => k.isActive).length,
          totalCoupons: coupons.length,
          usedCoupons: coupons.filter((c: any) => c.currentUses >= c.maxUses).length,
        },
        coupons: coupons.map((c: any) => ({
          _id: c._id,
          code: c.code,
          discount: c.discount,
          type: c.type,
          credits: c.credits,
          usedCount: c.currentUses,
          maxUses: c.maxUses,
          isActive: c.isActive,
          expiresAt: c.expiresAt,
          createdAt: c.createdAt,
        })),
      };
    })
  );

  sendSuccess(res, { resellers: data });
});
