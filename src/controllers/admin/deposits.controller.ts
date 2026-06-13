import { Request, Response } from 'express';
import asyncHandler from '@/utils/asyncHandler';
import { ApiError } from '@/utils/ApiError';
import { sendSuccess } from '@/utils/response';
import { connectDB } from '@/config';
import { Deposit } from '@/models/Deposit';
import { Transaction } from '@/models/Transaction';
import { User } from '@/models/User';
import { fetchPrices } from '@/services/coin-gecko';

// Map common crypto names to ticker keys for CoinGecko lookup
const NAME_TO_TICKER: Record<string, string> = {
  bitcoin: 'btc',
  ethereum: 'eth',
  tether: 'usdt',
  tron: 'trx',
  ripple: 'xrp',
  cardano: 'ada',
  solana: 'sol',
  polkadot: 'dot',
  dogecoin: 'doge',
  litecoin: 'ltc',
  monero: 'xmr',
  stellar: 'xlm',
  cosmos: 'atom',
  chainlink: 'link',
  uniswap: 'uni',
  avalanche: 'avax',
  polygon: 'matic',
  binancecoin: 'bnb',
  filecoin: 'fil',
  algorand: 'algo',
  arbitrum: 'arb',
  aptos: 'apt',
  sui: 'sui',
  optimism: 'op',
  near: 'near',
  injective: 'inj',
};

function nameToTicker(name: string): string | null {
  const lower = name.toLowerCase().trim();
  // Direct ticker match
  if (lower.length <= 6 && /^[a-z0-9]+$/.test(lower)) return lower;
  // Full name match
  return NAME_TO_TICKER[lower] || null;
}

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
      .populate('userId', 'name email username avatar')
      .sort({ createdAt: -1 })
      .lean(),
    Deposit.countDocuments(query),
  ]);

  let transactions: any[] = [];
  let txTotal = 0;

  if (includeTransactions) {
    [transactions, txTotal] = await Promise.all([
      Transaction.find(txQuery)
        .populate('userId', 'name email username avatar')
        .sort({ createdAt: -1 })
        .lean(),
      Transaction.countDocuments(txQuery),
    ]);
  }

  const depositMapped = deposits.map(mapDeposit);
  const txMapped = transactions.map(mapTransaction);

  // Deduplicate: exclude Deposit records that have a matching Transaction
  // (Cryptomus creates both a Deposit and Transaction for the same payment)
  const txMetaSet = new Set(
    txMapped.filter((t: any) => t.notes).map((t: any) => t.notes)
  );
  const dedupedDeposits = depositMapped.filter(
    (d: any) => !d.notes || !txMetaSet.has(d.notes)
  );

  // Auto-fill missing amountUSD via CoinGecko (both directions)
  const missingUsdEntries = [...dedupedDeposits, ...txMapped].filter(
    (d: any) => !d.amountUSD || d.amountUSD === 0 || !d.amount || d.amount === 0
  );
  if (missingUsdEntries.length > 0) {
    const tickers = missingUsdEntries
      .map((d: any) => nameToTicker(d.cryptoName))
      .filter(Boolean) as string[];
    if (tickers.length > 0) {
      const prices = await fetchPrices(tickers);
      const allMapped = [...dedupedDeposits, ...txMapped];
      for (const d of allMapped) {
        const ticker = nameToTicker(d.cryptoName);
        const price = ticker ? prices[ticker] : undefined;
        if (!price) continue;

        // amountUSD missing → amount * price
        if (!d.amountUSD || d.amountUSD === 0) {
          d.amountUSD = parseFloat((d.amount * price).toFixed(2));
        }
        // amount missing (0) → amountUSD / price
        if (!d.amount || d.amount === 0) {
          d.amount = parseFloat((d.amountUSD / price).toFixed(6));
        }
      }
    }
  }

  // Merge, sort by createdAt desc, then paginate
  const merged = [...dedupedDeposits, ...txMapped].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const total = dedupedDeposits.length + txTotal;
  const paged = merged.slice((page - 1) * limit, page * limit);

  sendSuccess(res, { deposits: paged, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
});

export const approve = asyncHandler(async (req: Request, res: Response) => {
  await connectDB();
  const deposit = await Deposit.findByIdAndUpdate(req.params.id, { $set: { status: 'approved' } }, { new: true });
  if (!deposit) throw new ApiError(404, 'Deposit not found');

  if (deposit.userId) {
    await User.findByIdAndUpdate(deposit.userId, { $inc: { credits: deposit.amountUSD || deposit.amount } });
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
