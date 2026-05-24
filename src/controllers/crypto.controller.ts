import { Request, Response } from 'express';
import asyncHandler from '@/utils/asyncHandler';
import { ApiError } from '@/utils/ApiError';
import { sendSuccess } from '@/utils/response';
import { CryptoConfig } from '@/models/CryptoConfig';
import { DepositAddress } from '@/models/DepositAddress';
import { Deposit } from '@/models/Deposit';
import { User } from '@/models/User';
import { getDepositHistory, getERC20Decimals, formatTokenBalance } from '@/lib/web3';

// ─────────────────────────────────────────────────────────────────────────────
// Config
// ─────────────────────────────────────────────────────────────────────────────
export const getConfig = asyncHandler(async (req: Request, res: Response) => {
  const isAdmin = (req as any).user?.role === 'admin';
  const query = isAdmin ? {} : { isActive: true };
  const configs = await CryptoConfig.find(query).select('-__v').lean();

  const filtered = configs.map((c: any) => ({
    ...c,
    networks: isAdmin ? c.networks : c.networks.filter((n: any) => n.isActive),
  }));

  sendSuccess(res, { data: filtered });
});

export const createOrUpdateConfig = asyncHandler(async (req: Request, res: Response) => {
  if ((req as any).user?.role !== 'admin') throw new ApiError(401, 'Unauthorized');
  const { id, name, fullName, icon, color, bg, borderGlow, networks, isActive } = req.body;
  if (!id || !name || !fullName || !networks?.length) throw new ApiError(400, 'Missing required fields');

  const existing = await CryptoConfig.findOne({ id });
  if (existing) {
    Object.assign(existing, { name, fullName, icon, color, bg, borderGlow, networks, isActive: isActive ?? true });
    await existing.save();
    return sendSuccess(res, { message: 'Crypto configuration updated', data: existing });
  }

  const created = await CryptoConfig.create({ id, name, fullName, icon, color, bg, borderGlow, networks, isActive: isActive ?? true });
  sendSuccess(res, { message: 'Crypto configuration created', data: created }, 201);
});

export const deleteConfig = asyncHandler(async (req: Request, res: Response) => {
  if ((req as any).user?.role !== 'admin') throw new ApiError(401, 'Unauthorized');
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

  await User.findByIdAndUpdate((req as any).user._id, { $inc: { balance: amountUSD || 0 } });

  sendSuccess(res, { message: 'Deposit recorded and balance updated', data: deposit }, 201);
});

export const getAddress = asyncHandler(async (req: Request, res: Response) => {
  const cryptoId = req.query.cryptoId as string;
  const networkId = req.query.networkId as string;

  if (!cryptoId || !networkId) throw new ApiError(400, 'cryptoId and networkId are required');

  const cryptoConfig = await CryptoConfig.findOne({ id: cryptoId, isActive: true });
  if (!cryptoConfig) throw new ApiError(400, 'Invalid cryptocurrency');

  const network = cryptoConfig.networks.find((n: any) => n.id === networkId && n.isActive);
  if (!network) throw new ApiError(400, 'Invalid network');

  let depositAddr = await DepositAddress.findOne({ userId: (req as any).user._id, cryptoId, networkId });

  if (!depositAddr) {
    const existingAny = await DepositAddress.findOne({ userId: (req as any).user._id });
    if (existingAny) {
      depositAddr = await DepositAddress.create({
        userId: (req as any).user._id, cryptoId, networkId,
        address: existingAny.address, privateKey: existingAny.privateKey, isActive: true,
      });
    } else {
      const { Wallet } = require('ethers');
      const wallet = Wallet.createRandom();
      depositAddr = await DepositAddress.create({
        userId: (req as any).user._id, cryptoId, networkId,
        address: wallet.address, privateKey: wallet.privateKey, isActive: true,
      });
    }
  }

  sendSuccess(res, {
    data: {
      address: depositAddr.address, cryptoId, cryptoName: cryptoConfig.name,
      networkId, networkName: network.name, minDeposit: network.minDeposit,
      fee: network.fee, confirmations: network.confirmations,
    },
  });
});

export const checkDeposits = asyncHandler(async (req: Request, res: Response) => {
  const address = req.query.address as string;
  if (!address) throw new ApiError(400, 'Address is required');

  const depAddr = await DepositAddress.findOne({ userId: (req as any).user._id, address, isActive: true });
  const newlyDetected: any[] = [];

  if (depAddr) {
    const config = await CryptoConfig.findOne({ id: depAddr.cryptoId, isActive: true });
    if (config) {
      const network = config.networks.find((n: any) => n.id === depAddr.networkId);
      if (network?.rpcUrl && network.address) {
        try {
          const data = await getDepositHistory(network.address, depAddr.address, network.rpcUrl);
          const decimals = await getERC20Decimals(network.rpcUrl, network.address);

          for (const tx of data) {
            const existing = await Deposit.findOne({ txHash: tx.txHash });
            if (existing) continue;

            const amountNum = Number(formatTokenBalance(tx.amount, decimals));
            await User.findByIdAndUpdate((req as any).user._id, { $inc: { balance: amountNum } });

            const deposit = await Deposit.create({
              userId: (req as any).user._id, cryptoId: depAddr.cryptoId, cryptoName: config.name,
              networkId: depAddr.networkId, networkName: network.name,
              amount: amountNum, amountUSD: amountNum, address: depAddr.address,
              txHash: tx.txHash, status: 'completed', confirmations: network.confirmations,
              requiredConfirmations: network.confirmations, fee: network.fee,
              notes: 'Incremental deposit detected via real-time polling',
            });
            newlyDetected.push(deposit);
          }
        } catch (rpcError) {
          console.error(`RPC error for ${depAddr.address} on ${network.name}:`, rpcError);
        }
      }
    }
  }

  sendSuccess(res, { data: newlyDetected });
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
