import { Request, Response } from 'express';
import asyncHandler from '@/utils/asyncHandler';
import { ApiError } from '@/utils/ApiError';
import { sendSuccess } from '@/utils/response';
import { User } from '@/models/User';
import { UserPackage } from '@/models/UserPackage';
import { Transaction } from '@/models/Transaction';
import { Deposit } from '@/models/Deposit';
import { SystemSetting } from '@/models/SystemSetting';
import { verifyWebhookSign, checkPaymentStatus, isPaid, isFailed } from '@/services/cryptomus';
import mongoose from 'mongoose';

/** Check payment status — called by frontend polling */
export const checkCryptomusPayment = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user._id;
  const { invoiceId } = req.params;

  if (!invoiceId) throw new ApiError(400, 'invoiceId is required');

  // Get credentials
  const settings = await SystemSetting.findOne();
  const merchantId = settings?.cryptomusMerchantId?.trim();
  const apiKey = settings?.cryptomusApiKey?.trim();
  const creditsPerDollar = settings?.cryptomusCreditsPerDollar || 1000;

  if (!merchantId || !apiKey) {
    throw new ApiError(500, 'Cryptomus not configured');
  }

  const payment = await checkPaymentStatus(invoiceId, merchantId, apiKey);

  if (isPaid(payment.status)) {
    // Check if already processed
    const existing = await Transaction.findOne({
      userId,
      type: 'deposit',
      meta: invoiceId,
    });

    if (!existing) {
      const credits = Math.round(parseFloat(payment.amount) * creditsPerDollar);

      // Add credits to user's active package
      const activePkg = await UserPackage.findOne({
        userId,
        status: 'active',
        endDate: { $gt: new Date() },
      });
      if (activePkg) {
        activePkg.credits += credits;
        await activePkg.save();
      }

      // Add credits to user account
      await User.findByIdAndUpdate(userId, { $inc: { credits: parseFloat(payment.amount) } });

      // Create transaction record
      await Transaction.create({
        userId,
        type: 'deposit',
        credits,
        amount: parseFloat(payment.amount),
        label: `${payment.payerCurrency || 'Crypto'}${payment.network ? ` (${payment.network})` : ''} Top-up`,
        meta: invoiceId,
      });
    }

    // Update Deposit record status to completed
    await Deposit.findOneAndUpdate(
      { notes: invoiceId },
      { $set: { status: 'completed' } },
    );

    return sendSuccess(res, {
      data: { status: 'paid', message: 'Payment successful! Credits added.' },
    });
  }

  if (isFailed(payment.status)) {
    // Set correct status: expired vs failed
    const newStatus = payment.status === 'expired' ? 'expired' : 'failed';
    await Deposit.findOneAndUpdate(
      { notes: invoiceId },
      { $set: { status: newStatus } },
    );

    return sendSuccess(res, {
      data: { status: newStatus, message: 'Payment failed or cancelled.' },
    });
  }

  // Still pending — include address/network when available (after payer selects coin)
  return sendSuccess(res, {
    data: {
      status: payment.status,
      address: payment.address,
      network: payment.network,
      payerCurrency: payment.payerCurrency,
    },
  });
});

/** GET /payment/:orderId — lookup payment info by order_id */
export const getPaymentByOrderId = asyncHandler(async (req: Request, res: Response) => {
  const { orderId } = req.params;

  if (!orderId) throw new ApiError(400, 'orderId is required');

  const settings = await SystemSetting.findOne();
  const merchantId = settings?.cryptomusMerchantId?.trim();
  const apiKey = settings?.cryptomusApiKey?.trim();

  if (!merchantId || !apiKey) {
    throw new ApiError(500, 'Cryptomus not configured');
  }

  const payment = await checkPaymentStatus(orderId, merchantId, apiKey, 'order_id');

  sendSuccess(res, {
    data: {
      uuid: payment.uuid,
      status: payment.status,
      amount: payment.amount,
      address: payment.address,
      network: payment.network,
      payerCurrency: payment.payerCurrency,
      url: payment.url,
      isFinal: payment.isFinal,
    },
  });
});

/** Cryptomus webhook — called by Cryptomus on payment status change */
export const cryptomusWebhook = asyncHandler(async (req: Request, res: Response) => {
  const sign = req.headers['sign'] as string;
  const rawBody = JSON.stringify(req.body);

  // Get credentials
  const settings = await SystemSetting.findOne();
  const apiKey = settings?.cryptomusApiKey?.trim();
  const merchantId = settings?.cryptomusMerchantId?.trim();
  const creditsPerDollar = settings?.cryptomusCreditsPerDollar || 1000;

  // Verify webhook signature
  if (!apiKey || !verifyWebhookSign(rawBody, sign, apiKey)) {
    console.warn('Cryptomus webhook: invalid signature');
    return sendSuccess(res, { received: true }); // Always respond 200 to avoid re-delivery
  }

  const { uuid, status, order_id, amount } = req.body;

  if (!uuid || !order_id) {
    return sendSuccess(res, { received: true });
  }

  // Extract userId from order_id (format: topup_{userId}_{timestamp})
  const match = order_id.match(/^topup_([^_]+)_/);
  if (!match) {
    console.warn('Cryptomus webhook: invalid order_id format', order_id);
    return sendSuccess(res, { received: true });
  }

  const userId = new mongoose.Types.ObjectId(match[1]);

  if (isPaid(status)) {
    // Check if already processed
    const existing = await Transaction.findOne({ meta: uuid, type: 'deposit' });
    if (existing) {
      return sendSuccess(res, { received: true }); // Already processed
    }

    const credits = Math.round(parseFloat(amount) * creditsPerDollar);
 

    // Add credits
    await User.findByIdAndUpdate(userId, { $inc: { credits: parseFloat(amount) } });

    // Create transaction
    await Transaction.create({
      userId,
      type: 'deposit',
      credits,
      amount: parseFloat(amount),
      label: `${req.body.payer_currency || 'Crypto'}${req.body.network ? ` (${req.body.network})` : ''} Top-up`,
      meta: uuid,
    });

    // Update Deposit record status
    await Deposit.findOneAndUpdate(
      { notes: uuid },
      { $set: { status: 'completed' } },
    );

    console.log(`Cryptomus: payment completed for user ${userId}, amount ${amount}, credits ${credits}`);
  }

  if (isFailed(status)) {
    // Set correct status: expired vs failed
    const newStatus = status === 'expired' ? 'expired' : 'failed';
    await Deposit.findOneAndUpdate(
      { notes: uuid },
      { $set: { status: newStatus } },
    );

    console.log(`Cryptomus: payment ${newStatus} for order ${order_id}, status: ${status}`);
  }

  // Always respond 200
  sendSuccess(res, { received: true });
});
