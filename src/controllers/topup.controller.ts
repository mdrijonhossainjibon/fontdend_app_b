import { Request, Response } from 'express';
import asyncHandler from '@/utils/asyncHandler';
import { ApiError } from '@/utils/ApiError';
import { sendSuccess } from '@/utils/response';
import { User } from '@/models/User';
import { UserPackage } from '@/models/UserPackage';
import { Transaction } from '@/models/Transaction';
import { Deposit } from '@/models/Deposit';
import { PromoCode } from '@/models/PromoCode';
import { SystemSetting } from '@/models/SystemSetting';
import { PricingPlan } from '@/models/PricingPlan';
import { createInvoice as cryptomusCreateInvoice, checkPaymentStatus, isPaid, isFailed } from '@/services/cryptomus';

// GET /topup/active-package
export const getActiveUserPackage = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user._id;

  const user = await User.findById(userId).select('balance');
  if (!user) throw new ApiError(404, 'User not found');

  const activeUserPackage = await UserPackage.findOne({
    userId,
    status: 'active',
    endDate: { $gt: new Date() }
  });

  sendSuccess(res, {
    balance: user.balance,
    activeUserPackage: activeUserPackage
      ? {
          code: activeUserPackage.packageCode,
          name: activeUserPackage.name,
          credits: activeUserPackage.credits,
          creditsUsed: activeUserPackage.creditsUsed,
        }
      : null,
  });
});

// GET /topup/pending-deposit
export const getPendingDeposit = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user._id;

  // Check for pending deposit (only return valid, non-expired)
  const pendingDeposit = await Deposit.findOne({
    userId,
    status: { $in: ['pending', 'confirming', 'checking'] },
    $or: [
      { expiresAt: { $exists: false } },
      { expiresAt: { $gt: new Date() } }
    ]
  }).select('amountUSD cryptoName networkName address status notes createdAt expiresAt');

  // Mark expired deposits as expired in DB
  if (!pendingDeposit) {
    await Deposit.updateMany(
      { userId, status: { $in: ['pending', 'confirming', 'checking'] }, expiresAt: { $lte: new Date(), $exists: true } },
      { $set: { status: 'expired' } }
    );
  }

  sendSuccess(res, {
    pendingDeposit: pendingDeposit
      ? {
          amountUSD: pendingDeposit.amountUSD,
          cryptoName: pendingDeposit.cryptoName,
          networkName: pendingDeposit.networkName,
          address: pendingDeposit.address,
          status: pendingDeposit.status,
          notes: pendingDeposit.notes,
          createdAt: pendingDeposit.createdAt,
          expiresAt: pendingDeposit.expiresAt,
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

  const activeUserPackage = await UserPackage.findOne({
    userId,
    status: 'active',
    endDate: { $gt: new Date() }
  });
  if (!activeUserPackage) throw new ApiError(400, 'No active package found');

  user.balance = Math.round((user.balance - price) * 100) / 100;
  activeUserPackage.credits += credits;
  await user.save();
  await activeUserPackage.save();

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

  const normalizedCode = code.trim().toUpperCase();

  // Look up promo code in database (normalized to uppercase)
  const promo = await PromoCode.findOne({ code: normalizedCode, isActive: true });
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
    meta: normalizedCode
  });
  if (alreadyRedeemed) throw new ApiError(400, 'Promo code already redeemed');

  // If code has a packageId, assign that PricingPlan to user
  let pkgInfo = null;
  if (promo.packageId) {
    const plan: any = await PricingPlan.findById(promo.packageId).lean();

    if (!plan) throw new ApiError(400, 'Linked package not found');

    // Create a new UserPackage from the PricingPlan
    const now = new Date();
    const endDate = new Date(now);
    endDate.setDate(endDate.getDate() + (plan.validityDays || 30));

    const userUserPackage = await UserPackage.create({
      userId,
      packageCode: plan.code,
      type: plan.type,
      name: plan.code,
      price: plan.price || 0,
      billingCycle: 'monthly',
      credits: plan.count || 0,
      creditsUsed: 0,
      features: [],
      status: 'active',
      autoRenew: false,
      startDate: now,
      endDate,
    });

    // Deactivate any existing active packages
    await UserPackage.updateMany(
      { userId, status: 'active', _id: { $ne: userUserPackage._id } },
      { $set: { status: 'cancelled' } }
    );

    // Increment usage counter
    promo.currentUses += 1;
    await promo.save();

    // Create transaction
    await Transaction.create({
      userId,
      type: 'redeem',
      credits: plan.count || 0,
      label: `UserPackage: ${plan.code}`,
      meta: normalizedCode,
    });

    pkgInfo = {
      code: plan.code,
      name: plan.code,
      type: plan.type,
      credits: plan.count || 0,
      validityDays: plan.validityDays,
      recognition: plan.recognition,
    };

    return sendSuccess(res, {
      data: {
        creditsAdded: plan.count || 0,
        totalCredits: userUserPackage.credits,
        code: normalizedCode,
        package: pkgInfo,
      },
    });
  }

  // Default: add credits to existing active package
  const activeUserPackage = await UserPackage.findOne({
    userId,
    status: 'active',
    endDate: { $gt: new Date() }
  });
  if (!activeUserPackage) throw new ApiError(400, 'No active package found');

  // Add credits
  activeUserPackage.credits += promo.credits || 0;
  await activeUserPackage.save();

  // Increment usage counter
  promo.currentUses += 1;
  await promo.save();

  // Create transaction
  const promoCredits = promo.credits || 0;
  await Transaction.create({
    userId,
    type: 'redeem',
    credits: promoCredits,
    label: 'Promo Code',
    meta: normalizedCode,
  });

  sendSuccess(res, {
    data: {
      creditsAdded: promoCredits,
      totalCredits: activeUserPackage.credits,
      code: normalizedCode,
    },
  });
});

// GET /topup/history
export const getHistory = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user._id;

  // Auto-expire stale deposits
  await Deposit.updateMany(
    { userId, status: { $in: ['pending', 'confirming', 'checking'] }, expiresAt: { $lte: new Date(), $exists: true } },
    { $set: { status: 'expired' } }
  );

  const transactions = await Transaction.find({ userId }).sort({ createdAt: -1 }).lean();

  // Fetch ALL Deposit records (including pending/confirming)
  const deposits = await Deposit.find({ userId })
    .sort({ createdAt: -1 })
    .select('amountUSD cryptoName networkName address status createdAt expiresAt notes')
    .lean();

  const now = new Date();
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const purchases = transactions.filter((t) => t.type === 'purchase');
  const redeems = transactions.filter((t) => t.type === 'redeem');

  const totalSpent = purchases.reduce((s, t) => s + (t.amount || 0), 0);
  const totalCreditsAdded = transactions
    .filter((t) => (t.credits ?? 0) > 0)
    .reduce((s, t) => s + (t.credits ?? 0), 0);
  const totalCreditsUsed = Math.abs(
    transactions
      .filter((t) => (t.credits ?? 0) < 0)
      .reduce((s, t) => s + (t.credits ?? 0), 0)
  );
  const thisMonthSpent = purchases
    .filter((t) => new Date(t.createdAt) >= firstOfMonth)
    .reduce((s, t) => s + (t.amount || 0), 0);

  const stats = {
    totalSpent,
    totalCreditsAdded,
    totalCreditsUsed,
    thisMonthSpent,
    transactionCount: transactions.length + deposits.length,
    redeemCount: redeems.length,
  };

  // Format transactions
  const formattedTxs = transactions.map((tx) => {
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

  // Format ALL deposit records (dedupe against transaction meta)
  const txDepositMetaSet = new Set(
    transactions.filter(t => t.type === 'deposit').map(t => t.meta)
  );
  const formattedDeposits = deposits
    .filter(d => !txDepositMetaSet.has((d as any).notes))
    .map((d: any) => {
      const dt = new Date(d.createdAt);
      const pad = (n: number) => String(n).padStart(2, '0');
      return {
        id: d._id,
        type: 'deposit',
        credits: 0,
        amount: d.amountUSD || 0,
        label: `${d.cryptoName || 'Crypto'}${d.networkName ? ` (${d.networkName})` : ''} Top-up`,
        meta: `invoice:${d.notes || ''}`,
        date: dt.getFullYear() + '-' + pad(dt.getMonth() + 1) + '-' + pad(dt.getDate()),
        time: pad(dt.getHours()) + ':' + pad(dt.getMinutes()),
        status: d.status,
        invoiceId: d.notes || '',
        address: d.address || '',
        cryptoName: d.cryptoName || '',
        networkName: d.networkName || '',
        expiresAt: d.expiresAt || null,
      };
    });

  sendSuccess(res, { data: { stats, transactions: [...formattedTxs, ...formattedDeposits].sort((a: any, b: any) => `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`)) } });
});

// GET /topup/invoice/:invoiceId
export const getInvoice = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user._id;
  const { invoiceId } = req.params;

  const deposit = await Deposit.findOne({ userId, notes: invoiceId })
    .select('amountUSD cryptoName networkName address status createdAt expiresAt notes')
    .lean();

  if (!deposit) throw new ApiError(404, 'Invoice not found');

  sendSuccess(res, { data: deposit });
});

// POST /topup/cancel-deposit
export const cancelDeposit = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user._id;
  const { depositId } = req.body;

  if (!depositId) throw new ApiError(400, 'depositId is required');

  const deposit = await Deposit.findOneAndUpdate(
    { _id: depositId, userId, status: { $in: ['pending', 'confirming', 'checking'] } },
    { $set: { status: 'rejected' } },
    { new: true }
  );

  if (!deposit) throw new ApiError(404, 'Pending deposit not found');

  sendSuccess(res, { message: 'Deposit cancelled', deposit });
});

// POST /topup/cryptomus/create-invoice
export const createCryptomusInvoice = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user._id;
  const { amount, currency, network } = req.body;

  if (!amount || amount <= 0) throw new ApiError(400, 'Amount must be greater than 0');
  if (amount > 10000) throw new ApiError(400, 'Amount cannot exceed $10,000');

  // Check for existing pending or confirming deposits
  const pendingDeposit = await Deposit.findOne({
    userId,
    status: { $in: ['pending', 'confirming', 'checking'] },
    $or: [
      { expiresAt: { $exists: false } },
      { expiresAt: { $gt: new Date() } }
    ]
  });

  if (pendingDeposit) {
    throw new ApiError(400, 'You have a pending deposit. Please complete or wait for it to expire before creating a new one.');
  }

  const orderId = `topup_${userId}_${Date.now()}`;

  // Fetch Cryptomus credentials from admin settings
  let merchantId: string | undefined;
  let apiKey: string | undefined;

  try {
    const settings = await SystemSetting.findOne();
    merchantId = settings?.cryptomusMerchantId?.trim() || undefined;
    apiKey = settings?.cryptomusApiKey?.trim() || undefined;
  } catch {
    // DB query failed — fallback silently (handled inside service)
  }

  if (currency && network) {
    const invoice = await cryptomusCreateInvoice({
      amount,
      orderId,
      toCurrency: currency,
      network,
      merchantId,
      apiKey,
    });

    // Create pending Deposit record for admin orders tracking
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await Deposit.create({
      userId,
      cryptoId: currency,
      cryptoName: currency,
      networkId: network,
      networkName: invoice.network || network,
      amount: 0,
      amountUSD: amount,
      address: invoice.address || '',
      status: 'pending',
      confirmations: 0,
      requiredConfirmations: 1,
      fee: '0',
      notes: invoice.invoiceId,
      expiresAt,
    });

    return sendSuccess(res, {
      data: {
        url: invoice.url,
        invoiceId: invoice.invoiceId,
        walletAddress: invoice.address,
        network: invoice.network || network,
        paymentAmount: amount,
        currency,
      },
    });
  }

  // Fallback: no currency/network, generic invoice
  const invoice = await cryptomusCreateInvoice({ amount, orderId, merchantId, apiKey });

  const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
  await Deposit.create({
    userId,
    cryptoId: currency || 'Crypto',
    cryptoName: currency || 'Crypto',
    networkId: 'default',
    networkName: invoice.network || 'default',
    amount: 0,
    amountUSD: amount,
    address: invoice.address || '',
    status: 'pending',
    confirmations: 0,
    requiredConfirmations: 1,
    fee: '0',
    notes: invoice.invoiceId,
    expiresAt,
  });

  sendSuccess(res, {
    data: {
      url: invoice.url,
      invoiceId: invoice.invoiceId,
      walletAddress: invoice.address,
      network: invoice.network,
      paymentAmount: amount,
      currency: currency || null,
    },
  });
});

// POST /topup/check-payment
export const checkTopupPayment = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user._id;

  const deposit = await Deposit.findOne({
    userId,
    status: { $in: ['pending', 'confirming', 'checking'] },
    $or: [
      { expiresAt: { $exists: false } },
      { expiresAt: { $gt: new Date() } },
    ],
  });

  if (!deposit) {
    return sendSuccess(res, { status: 'no_pending_deposit', deposit: null });
  }

  const invoiceId = deposit.notes;
  if (!invoiceId) {
    // No Cryptomus invoice — just return current status
    return sendSuccess(res, { status: deposit.status, deposit });
  }

  const settings = await SystemSetting.findOne();
  const merchantId = settings?.cryptomusMerchantId?.trim();
  const apiKey = settings?.cryptomusApiKey?.trim();
  const creditsPerDollar = settings?.cryptomusCreditsPerDollar || 1000;

  if (!merchantId || !apiKey) {
    return sendSuccess(res, { status: deposit.status, deposit });
  }

  const payment = await checkPaymentStatus(invoiceId, merchantId, apiKey);

  // Build update fields for direct DB write (bypass Mongoose change tracking)
  const updateFields: Record<string, any> = {};
  if (payment.txid) updateFields.txHash = payment.txid;

  if (isPaid(payment.status)) {
    updateFields.status = 'completed';
    if (payment.txid) updateFields.txHash = payment.txid;

    const existing = await Transaction.findOne({
      userId: deposit.userId,
      type: 'deposit',
      meta: invoiceId,
    });

    if (!existing) {
      const credits = Math.round(parseFloat(payment.amount) * creditsPerDollar);

      await User.findByIdAndUpdate(deposit.userId, {
        $inc: { balance: parseFloat(payment.amount) }
      });

      const activePkg = await UserPackage.findOne({
        userId: deposit.userId,
        status: 'active',
        endDate: { $gt: new Date() },
      });
      if (activePkg) {
        activePkg.credits += credits;
        await activePkg.save();
      }

      const userData = await User.findById(deposit.userId).select('balance');
      await Transaction.create({
        userId: deposit.userId,
        type: 'deposit',
        credits,
        amount: parseFloat(payment.amount),
        balanceBefore: (userData?.balance || 0) - parseFloat(payment.amount),
        balanceAfter: userData?.balance || 0,
        currency: payment.payerCurrency || 'USDT',
        description: `${payment.payerCurrency || 'Crypto'} deposit via Cryptomus`,
        referenceType: 'deposit',
        referenceId: invoiceId,
        label: `${payment.payerCurrency || 'Crypto'}${payment.network ? ` (${payment.network})` : ''} Top-up`,
        meta: invoiceId,
      });
    }

    await Deposit.updateOne({ _id: deposit._id }, { $set: updateFields });

    return sendSuccess(res, {
      status: 'completed',
      message: 'Payment confirmed!',
      deposit: {
        _id: deposit._id,
        amountUSD: deposit.amountUSD,
        cryptoName: deposit.cryptoName,
        networkName: deposit.networkName,
        address: deposit.address,
        status: 'completed',
        txHash: deposit.txHash,
        notes: deposit.notes,
        createdAt: deposit.createdAt,
        expiresAt: deposit.expiresAt,
      },
    });
  }

  // confirm_check → confirming, save txHash
  if (payment.status === 'confirm_check') {
    updateFields.status = 'confirming';
    await Deposit.updateOne({ _id: deposit._id }, { $set: updateFields });

    return sendSuccess(res, {
      status: 'confirming',
      message: 'Payment confirmed by Cryptomus, awaiting blockchain confirmations',
      deposit: {
        _id: deposit._id,
        amountUSD: deposit.amountUSD,
        cryptoName: deposit.cryptoName,
        networkName: deposit.networkName,
        address: deposit.address,
        status: 'confirming',
        txHash: updateFields.txHash || deposit.txHash,
        notes: deposit.notes,
        createdAt: deposit.createdAt,
        expiresAt: deposit.expiresAt,
      },
    });
  }

  if (isFailed(payment.status)) {
    const newStatus = payment.status === 'expired' ? 'expired' : 'failed';
    updateFields.status = newStatus;
    await Deposit.updateOne({ _id: deposit._id }, { $set: updateFields });

    return sendSuccess(res, {
      status: newStatus,
      message: `Payment ${newStatus}`,
      deposit: {
        _id: deposit._id,
        amountUSD: deposit.amountUSD,
        cryptoName: deposit.cryptoName,
        networkName: deposit.networkName,
        address: deposit.address,
        status: newStatus,
        txHash: updateFields.txHash || deposit.txHash,
        notes: deposit.notes,
        createdAt: deposit.createdAt,
        expiresAt: deposit.expiresAt,
      },
    });
  }

  await Deposit.updateOne({ _id: deposit._id }, { $set: updateFields });

  return sendSuccess(res, {
    status: deposit.status,
    message: `Payment still ${payment.status}`,
    deposit: {
      _id: deposit._id,
      amountUSD: deposit.amountUSD,
      cryptoName: deposit.cryptoName,
      networkName: deposit.networkName,
      address: deposit.address,
      status: deposit.status,
      txHash: updateFields.txHash || deposit.txHash,
      notes: deposit.notes,
      createdAt: deposit.createdAt,
      expiresAt: deposit.expiresAt,
    },
  });
});
