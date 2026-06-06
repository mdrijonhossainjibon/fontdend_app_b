import { Request, Response } from 'express';
import asyncHandler from '@/utils/asyncHandler';
import { ApiError } from '@/utils/ApiError';
import { sendSuccess } from '@/utils/response';
import { connectDB } from '@/config';
import { Deposit } from '@/models/Deposit';
import { Transaction } from '@/models/Transaction';
import { User } from '@/models/User';

function mapDeposit(d: any) {
  return {
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
    expiresAt: d.expiresAt || null,
  };
}

function mapTransaction(tx: any) {
  const label = tx.label || 'Crypto';
  let cryptoName = label;
  let networkName = '';

  // Extract network if it's in the format "USDT (TRC20) Top-up"
  const networkMatch = label.match(/\(([^)]+)\)/);
  if (networkMatch) {
    networkName = networkMatch[1];
    cryptoName = label.replace(/\s*\([^)]+\)\s*Top-up$/, '').trim();
  } else if (label.endsWith(' Top-up')) {
    cryptoName = label.replace(/\s*Top-up$/, '').trim();
  }

  return {
    _id: tx._id,
    userId: tx.userId,
    type: 'deposit',
    status: 'completed',
    amount: tx.amount || 0,
    amountUSD: tx.amount || 0,
    cryptoName,
    networkName,
    address: '',
    txHash: '',
    credits: tx.credits || 0,
    confirmations: 0,
    requiredConfirmations: 0,
    fee: 0,
    notes: tx.meta || '',
    createdAt: tx.createdAt,
    updatedAt: tx.updatedAt,
  };
}

export const list = asyncHandler(async (req: Request, res: Response) => {
  await connectDB();

  // Auto-expire stale pending deposits before listing
  await Deposit.updateMany(
    { status: { $in: ['pending', 'confirming'] }, expiresAt: { $lte: new Date(), $exists: true } },
    { $set: { status: 'expired' } }
  );

  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const { status, search } = req.query;

  const query: Record<string, unknown> = {};
  if (status) query.status = status;

  let matchingUserIds: any[] = [];

  if (search && search !== '') {
    const searchStr = String(search);
    const searchRegex = { $regex: searchStr, $options: 'i' };

    const matchingUsers = await User.find({
      $or: [
        { name: searchRegex },
        { email: searchRegex },
        { username: searchRegex },
      ],
    })
      .select('_id')
      .lean();

    matchingUserIds = matchingUsers.map((u: any) => u._id);

    query.$or = [
      { address: searchRegex },
      { txHash: searchRegex },
      { cryptoName: searchRegex },
      { networkName: searchRegex },
    ];

    if (matchingUserIds.length > 0) {
      (query.$or as any[]).push({ userId: { $in: matchingUserIds } });
    }
  }

  // Build Transaction query for deposits created by Cryptomus flow
  const txQuery: Record<string, unknown> = { type: 'deposit' };
  if (search && search !== '') {
    const searchStr = String(search);
    const searchRegex = { $regex: searchStr, $options: 'i' };
    txQuery.$or = [
      { label: searchRegex },
      { meta: searchRegex },
    ];
    if (matchingUserIds.length > 0) {
      (txQuery.$or as any[]).push({ userId: { $in: matchingUserIds } });
    }
  }

  // Only include Transactions when status filter is empty or 'completed'
  // (Transactions are only created when payment succeeds)
  const includeTransactions = !status || status === 'completed';

  const [deposits, depositTotal] = await Promise.all([
    Deposit.find(query)
      .populate('userId', 'name email username')
      .sort({ createdAt: -1 })
      .lean(),
    Deposit.countDocuments(query),
  ]);

  let transactions: any[] = [];
  let txTotal = 0;

  if (includeTransactions) {
    [transactions, txTotal] = await Promise.all([
      Transaction.find(txQuery)
        .populate('userId', 'name email username')
        .sort({ createdAt: -1 })
        .lean(),
      Transaction.countDocuments(txQuery),
    ]);
  }

  const depositMapped = deposits.map(mapDeposit);
  const txMapped = transactions.map(mapTransaction);

  // Merge, sort by createdAt desc, then paginate
  const merged = [...depositMapped, ...txMapped].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const total = depositTotal + txTotal;
  const paged = merged.slice((page - 1) * limit, page * limit);

  sendSuccess(res, { deposits: paged, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
});

export const approve = asyncHandler(async (req: Request, res: Response) => {
  await connectDB();
  const deposit = await Deposit.findByIdAndUpdate(req.params.id, { $set: { status: 'approved' } }, { new: true });
  if (!deposit) throw new ApiError(404, 'Deposit not found');

  if (deposit.userId) {
    await User.findByIdAndUpdate(deposit.userId, { $inc: { balance: deposit.amountUSD || deposit.amount } });
  }

  sendSuccess(res, { message: 'Deposit marked as approved and balance updated', deposit });
});

export const reject = asyncHandler(async (req: Request, res: Response) => {
  await connectDB();
  const deposit = await Deposit.findByIdAndUpdate(req.params.id, { $set: { status: 'rejected' } }, { new: true });
  if (!deposit) throw new ApiError(404, 'Deposit not found');
  sendSuccess(res, { message: 'Deposit marked as rejected', deposit });
});

export const clearDeposits = asyncHandler(async (req: Request, res: Response) => {
  await connectDB();
  const { status, clearAll } = req.query;

  if (clearAll !== 'true') {
    throw new ApiError(400, 'clearAll must be true');
  }

  const query: Record<string, unknown> = {};
  if (status) {
    query.status = status;
  }

  const depositResult = await Deposit.deleteMany(query);

  let txResult = { deletedCount: 0 };
  if (!status || status === 'completed') {
    txResult = await Transaction.deleteMany({ type: 'deposit' });
  }

  sendSuccess(res, { message: 'Orders cleared successfully', deleted: { deposits: depositResult.deletedCount, transactions: txResult.deletedCount } });
});
