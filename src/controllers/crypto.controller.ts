import { Request, Response } from 'express';
import asyncHandler from '@/utils/asyncHandler';
import { ApiError } from '@/utils/ApiError';
import { sendSuccess } from '@/utils/response';
import { CryptoConfig } from '@/models/CryptoConfig';
import { Deposit } from '@/models/Deposit';
import { User } from '@/models/User';

// ─────────────────────────────────────────────────────────────────────────────
// Config
// ─────────────────────────────────────────────────────────────────────────────
export const getConfig = asyncHandler(async (req: Request, res: Response) => {
  const isAdmin = ['admin', 'superadmin'].includes((req as any).user?.role);
  const query = isAdmin ? {} : { status: 'active' };
  const configs = await CryptoConfig.find(query).select('-__v').lean();

  const filtered = configs.map((c: any) => ({
    ...c,
    networks: isAdmin ? c.networks : c.networks.filter((n: any) => n.status === 'active' || !n.status),
  }));

  sendSuccess(res, { data: filtered });
});

export const createOrUpdateConfig = asyncHandler(async (req: Request, res: Response) => {
  if (!['admin', 'superadmin'].includes((req as any).user?.role)) throw new ApiError(401, 'Unauthorized');
  const { id, name, fullName, icon, networks, status } = req.body;
  if (!id || !name || !fullName || !networks?.length) throw new ApiError(400, 'Missing required fields');

  const existing = await CryptoConfig.findOne({ id });
  if (existing) {
    Object.assign(existing, { name, fullName, icon, networks, status: status || 'active' });
    await existing.save();
    return sendSuccess(res, { message: 'Crypto configuration updated', data: existing });
  }

  const created = await CryptoConfig.create({ id, name, fullName, icon, networks, status: status || 'active' });
  sendSuccess(res, { message: 'Crypto configuration created', data: created }, 201);
});

export const deleteConfig = asyncHandler(async (req: Request, res: Response) => {
  if (!['admin', 'superadmin'].includes((req as any).user?.role)) throw new ApiError(401, 'Unauthorized');
  const id = req.query.id as string;
  if (!id) throw new ApiError(400, 'ID is required');

  const deleted = await CryptoConfig.findOneAndDelete({ id });
  if (!deleted) throw new ApiError(404, 'Configuration not found');

  sendSuccess(res, { message: 'Crypto configuration deleted' });
});

// ─────────────────────────────────────────────────────────────────────────────
// Deposits
// ─────────────────────────────────────────────────────────────────────────────
export const getDeposits = asyncHandler(async (req: Request, res: Response) => {
  const status = req.query.status as string;
  const limit = parseInt(req.query.limit as string) || 50;
  const skip = parseInt(req.query.skip as string) || 0;

  const query: any = { userId: (req as any).user._id };
  if (status) query.status = status;

  const [deposits, total] = await Promise.all([
    Deposit.find(query).sort({ createdAt: -1 }).limit(limit).skip(skip).select('-__v').lean(),
    Deposit.countDocuments(query),
  ]);

  sendSuccess(res, { data: { deposits, total, limit, skip } });
});

export const createDeposit = asyncHandler(async (req: Request, res: Response) => {
  const { cryptoId, cryptoName, networkId, networkName, amount, amountUSD, txHash, address, requiredConfirmations, fee, notes } = req.body;

  if (!cryptoId || !cryptoName || !networkId || !networkName || !amount || !address || !requiredConfirmations || !fee)
    throw new ApiError(400, 'Missing required fields');

  const deposit = await Deposit.create({
    userId: (req as any).user._id, cryptoId, cryptoName, networkId, networkName,
    amount, amountUSD: amountUSD || 0, txHash, address, status: 'completed',
    confirmations: requiredConfirmations, requiredConfirmations, fee, notes,
  });

  await User.findByIdAndUpdate((req as any).user._id, { $inc: { credits: amountUSD || 0 } });

  sendSuccess(res, { message: 'Deposit recorded and credits updated', data: deposit }, 201);
});

// ─────────────────────────────────────────────────────────────────────────────
// Payouts
// ─────────────────────────────────────────────────────────────────────────────
export const getPayouts = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.query.userId as string;
  if (!userId) throw new ApiError(400, 'Missing userId parameter');
  sendSuccess(res, { data: [] });
});

export const createPayout = asyncHandler(async (req: Request, res: Response) => {
  const { cryptoId, networkId, amount, toAddress, userId } = req.body;

  if (!cryptoId || !networkId || !amount || !toAddress || !userId)
    throw new ApiError(400, 'Missing required fields: cryptoId, networkId, amount, toAddress, userId');

  const parsedAmount = parseFloat(amount);
  if (isNaN(parsedAmount) || parsedAmount <= 0) throw new ApiError(400, 'Invalid amount');
  if (!toAddress.match(/^(0x[a-fA-F0-9]{40}|[13][a-km-zA-HJ-NP-Z1-9]{25,34}|T[A-Za-z1-9]{33})$/))
    throw new ApiError(400, 'Invalid wallet address format');

  const payoutRecord = {
    id: `payout_${Date.now()}`, userId, cryptoId, networkId,
    amount: parsedAmount, toAddress, status: 'pending', createdAt: new Date(), txHash: null,
  };

  sendSuccess(res, { message: 'Payout request submitted successfully', data: payoutRecord });
});
