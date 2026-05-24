import { Request, Response } from 'express';
import asyncHandler from '@/utils/asyncHandler';
import { ApiError } from '@/utils/ApiError';
import { sendSuccess } from '@/utils/response';
import { connectDB } from '@/config';
import { Deposit } from '@/models/Deposit';
import { User } from '@/models/User';

export const list = asyncHandler(async (req: Request, res: Response) => {
  await connectDB();
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const { status, search } = req.query;

  const query: Record<string, unknown> = {};
  if (status) query.status = status;

  if (search && search !== '') {
    const searchStr = String(search);
    const searchRegex = { $regex: searchStr, $options: 'i' };

    // Find matching user IDs
    const matchingUsers = await User.find({
      $or: [
        { name: searchRegex },
        { email: searchRegex },
        { username: searchRegex },
      ],
    })
      .select('_id')
      .lean();

    const userIds = matchingUsers.map((u: any) => u._id);

    query.$or = [
      { address: searchRegex },
      { txHash: searchRegex },
      { cryptoName: searchRegex },
      { networkName: searchRegex },
    ];

    if (userIds.length > 0) {
      (query.$or as any[]).push({ userId: { $in: userIds } });
    }
  }

  const [deposits, total] = await Promise.all([
    Deposit.find(query)
      .populate('userId', 'name email username')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Deposit.countDocuments(query),
  ]);

  const mapped = (deposits as any[]).map((d) => ({
    _id: d._id,
    userId: d.userId,
    type: 'deposit',
    status: d.status,
    amount: d.amount,
    amountUSD: d.amountUSD,
    cryptoName: d.cryptoName,
    networkName: d.networkName,
    address: d.address,
    txHash: d.txHash,
    credits: Math.round(d.amountUSD || 0),
    confirmations: d.confirmations,
    requiredConfirmations: d.requiredConfirmations,
    fee: d.fee,
    notes: d.notes,
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
  }));

  sendSuccess(res, { deposits: mapped, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
});

export const approve = asyncHandler(async (req: Request, res: Response) => {
  await connectDB();
  const deposit = await Deposit.findByIdAndUpdate(req.params.id, { $set: { status: 'completed' } }, { new: true });
  if (!deposit) throw new ApiError(404, 'Deposit not found');

  if (deposit.userId) {
    await User.findByIdAndUpdate(deposit.userId, { $inc: { balance: deposit.amountUSD || deposit.amount } });
  }

  sendSuccess(res, { message: 'Deposit marked as completed and balance updated', deposit });
});

export const reject = asyncHandler(async (req: Request, res: Response) => {
  await connectDB();
  const deposit = await Deposit.findByIdAndUpdate(req.params.id, { $set: { status: 'failed' } }, { new: true });
  if (!deposit) throw new ApiError(404, 'Deposit not found');
  sendSuccess(res, { message: 'Deposit marked as failed', deposit });
});
