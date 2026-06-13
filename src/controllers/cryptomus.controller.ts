import { Request, Response } from 'express';
import asyncHandler from '@/utils/asyncHandler';
import { ApiError } from '@/utils/ApiError';
import { sendSuccess } from '@/utils/response';
import { User } from '@/models/User';
import { UserPackage } from '@/models/UserPackage';
import { Transaction } from '@/models/Transaction';
import { Deposit } from '@/models/Deposit';
import { SystemSetting } from '@/models/SystemSetting';
import { checkPaymentStatus, isPaid, isFailed } from '@/services/cryptomus';

/** Check payment status — called by frontend polling */
export const checkCryptomusPayment = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user._id;
  const { invoiceId } = req.params;
  console.log(`[payment-status] userId=${userId} invoiceId=${invoiceId}`);

  if (!invoiceId) throw new ApiError(400, 'invoiceId is required');

  // Get credentials
  const settings = await SystemSetting.findOne();
  const merchantId = settings?.cryptomusMerchantId?.trim();
  const apiKey = settings?.cryptomusApiKey?.trim();
  const creditsPerDollar = settings?.cryptomusCreditsPerDollar || 1000;

  if (!merchantId || !apiKey) {
    console.error(`[payment-status] Cryptomus not configured for userId=${userId}`);
    throw new ApiError(500, 'Cryptomus not configured');
  }

  const payment = await checkPaymentStatus(invoiceId, merchantId, apiKey);
  console.log(`[payment-status] invoiceId=${invoiceId} rawStatus=${payment.status} amount=${payment.amount} payerCurrency=${payment.payerCurrency}`);

  if (isPaid(payment.status)) {
    console.log(`[payment-status] PAID detected invoiceId=${invoiceId}`);

    // Check if already processed
    const existing = await Transaction.findOne({
      userId,
      type: 'deposit',
      meta: invoiceId,
    });

    if (!existing) {
      console.log(`[payment-status] Processing payment invoiceId=${invoiceId} userId=${userId}`);
      const credits = Math.round(parseFloat(payment.amount) * creditsPerDollar);

      // Get user's current balance for balanceBefore/balanceAfter
      const userData = await User.findById(userId).select('balance');
      const balanceBefore = userData?.balance || 0;
      const balanceAfter = balanceBefore + parseFloat(payment.amount);

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
      await User.findByIdAndUpdate(userId, { $inc: { balance: parseFloat(payment.amount) } });

      // Create transaction record
      await Transaction.create({
        userId,
        type: 'deposit',
        credits,
        amount: parseFloat(payment.amount),
        balanceBefore,
        balanceAfter,
        currency: payment.payerCurrency || 'USDT',
        description: `${payment.payerCurrency || 'Crypto'} deposit via Cryptomus`,
        referenceType: 'deposit',
        referenceId: invoiceId,
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
  // Map Cryptomus statuses to our internal statuses
  const mappedStatus =
    payment.status === 'check' ? 'checking' :
    payment.status === 'confirm_check' ? 'checking' :
    payment.status === 'wait_confirm' ? 'confirming' :
    payment.status === 'confirming' ? 'confirming' :
    payment.status;

  return sendSuccess(res, {
    data: {
      status: mappedStatus,
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

