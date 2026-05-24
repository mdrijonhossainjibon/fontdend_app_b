import { Request, Response } from 'express';
import asyncHandler from '@/utils/asyncHandler';
import { sendSuccess, sendError } from '@/utils/response';
import { connectDB } from '@/config';
import { DepositAddress } from '@/models/DepositAddress';
import { CryptoConfig } from '@/models/CryptoConfig';
import { User } from '@/models/User';
import { getNativeBalance, getERC20Balance, getERC20Decimals, formatTokenBalance } from '@/lib/web3';

export const list = asyncHandler(async (req: Request, res: Response) => {
  await connectDB();

  const { search, page = '1', limit = '20' } = req.query;

  const filter: any = {};

  if (search && search !== '') {
    const searchStr = String(search);
    const searchRegex = { $regex: searchStr, $options: 'i' };

    // Find matching user IDs so we can search by user name/email/username too
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

    filter.$or = [
      { cryptoId: searchRegex },
      { networkId: searchRegex },
      { address: searchRegex },
    ];

    if (userIds.length > 0) {
      filter.$or.push({ userId: { $in: userIds } });
    }
  }

  const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(String(limit), 10) || 20));
  const skip = (pageNum - 1) * limitNum;

  const [addresses, total] = await Promise.all([
    DepositAddress.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .populate('userId', 'name email username')
      .lean(),
    DepositAddress.countDocuments(filter),
  ]);

  const totalPages = Math.ceil(total / limitNum);

  const addressesWithUser = (addresses as any[]).map((addr: any) => ({
    ...addr,
    user: addr.userId || null,
  }));

  // Sync on-chain balances if requested
  const { sync } = req.query;
  if (sync === 'true' && addressesWithUser.length > 0) {
    const updates: { id: string; lastBalance: number }[] = [];

    await Promise.all(
      addressesWithUser.map(async (addr: any) => {
        try {
          const config = await CryptoConfig.findOne({ id: addr.cryptoId }).lean();
          if (!config) return;

          const network = (config as any).networks.find(
            (n: any) => n.id === addr.networkId,
          );
          if (!network?.rpcUrl) return;

          const rpcUrl = network.rpcUrl;
          const isToken = !!network.tokenAddress;

          let humanBalance: number;
          if (isToken) {
            const [rawBalance, decimals] = await Promise.all([
              getERC20Balance(rpcUrl, network.tokenAddress!, addr.address),
              getERC20Decimals(rpcUrl, network.tokenAddress!),
            ]);
            humanBalance = parseFloat(formatTokenBalance(rawBalance, decimals));
          } else {
            const rawBalance = await getNativeBalance(rpcUrl, addr.address);
            humanBalance = parseFloat(formatTokenBalance(rawBalance, 18));
          }

          if (!isNaN(humanBalance)) {
            updates.push({ id: addr._id.toString(), lastBalance: humanBalance });
          }
        } catch {
          // skip individual failures, keep stale data
        }
      }),
    );

    // Batch-update DB
    if (updates.length > 0) {
      const bulkOps = updates.map((u) => ({
        updateOne: {
          filter: { _id: u.id },
          update: { $set: { lastBalance: u.lastBalance } },
        },
      }));
      await DepositAddress.bulkWrite(bulkOps);

      // Patch in-memory array so response reflects fresh balances
      for (const addr of addressesWithUser) {
        const u = updates.find((x) => x.id === addr._id.toString());
        if (u) addr.lastBalance = u.lastBalance;
      }
    }
  }

  sendSuccess(res, {
    depositAddresses: addressesWithUser,
    pagination: { total, totalPages, page: pageNum, limit: limitNum },
  });
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  await connectDB();

  const { id, isActive } = req.body;

  if (!id) {
    sendError(res, 400, 'id is required');
    return;
  }

  const address = await DepositAddress.findByIdAndUpdate(
    id,
    { $set: { isActive } },
    { new: true }
  );

  if (!address) {
    sendError(res, 404, 'Deposit address not found');
    return;
  }

  sendSuccess(res, { address });
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  await connectDB();

  const { id } = req.query;

  if (!id || String(id).trim() === '') {
    sendError(res, 400, 'id is required');
    return;
  }

  const result = await DepositAddress.findByIdAndDelete(String(id));
  if (!result) {
    sendError(res, 404, 'Deposit address not found');
    return;
  }

  sendSuccess(res, { message: 'Deleted' });
});

export const checkBalance = asyncHandler(async (req: Request, res: Response) => {
  await connectDB();

  const { id } = req.body;

  if (!id) {
    sendError(res, 400, 'id is required');
    return;
  }

  const address = await DepositAddress.findById(id);
  if (!address) {
    sendError(res, 404, 'Deposit address not found');
    return;
  }

  sendSuccess(res, {
    id: address._id,
    balance: address.lastBalance || 0,
    cryptoId: address.cryptoId,
  });
});
