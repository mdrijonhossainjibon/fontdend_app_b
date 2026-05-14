import { Request, Response } from 'express';
import asyncHandler from '@/utils/asyncHandler';
import { sendSuccess } from '@/utils/response';
import { User } from '@/models/User';
import { Referral } from '@/models/Referral';

export const getReferralStats = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user._id;
  const user = await User.findById(userId).select('referralCode referralEarnings name');
  if (!user) return sendSuccess(res, { stats: null });

  // Auto-generate referral code for users who don't have one
  if (!user.referralCode) {
    const base = (user.name || 'user').toLowerCase().replace(/[^a-z0-9]/g, '') || 'user';
    const suffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    const newCode = base.substring(0, 8) + '_' + suffix;
    await User.findByIdAndUpdate(userId, { referralCode: newCode });
    user.referralCode = newCode;
  }

  const referrals = await Referral.find({ referrerUserId: userId });
  const totalReferrals = referrals.length;
  const activeUsers = referrals.filter(r => r.status === 'active').length;
  const totalEarned = user.referralEarnings || 0;
  const pendingEarnings = referrals
    .filter(r => r.status === 'active')
    .reduce((sum, r) => sum + (r.commissionEarned || 0), 0);
  const commissionRate = 15;

  sendSuccess(res, {
    stats: {
      totalReferrals,
      activeUsers,
      totalEarned,
      pendingEarnings,
      commissionRate,
      referralCode: user.referralCode,
      referralLink: `${req.protocol}://${req.get('host')}/auth/signup?ref=${user.referralCode}`,
    },
  });
});

export const getReferralList = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user._id;
  const referrals = await Referral.find({ referrerUserId: userId })
    .populate('referredUserId', 'name email createdAt')
    .sort({ createdAt: -1 })
    .limit(20);

  const list = referrals.map(r => {
    const referred = r.referredUserId as any;
    return {
      id: r._id,
      user: referred ? { name: referred.name, email: referred.email } : { name: 'Unknown', email: '' },
      joined: referred ? referred.createdAt : r.createdAt,
      status: r.status,
      commission: r.commissionEarned || 0,
    };
  });

  sendSuccess(res, { referrals: list });
});
