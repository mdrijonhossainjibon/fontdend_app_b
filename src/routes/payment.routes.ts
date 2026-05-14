import { Router } from 'express';
import asyncHandler from '@/utils/asyncHandler';
import { ApiError } from '@/utils/ApiError';
import { sendSuccess } from '@/utils/response';
import { authMiddleware } from '@/middlewares/auth.middleware';
import { User } from '@/models/User';

const router = Router();

router.post('/create-payment-intent', authMiddleware, asyncHandler(async (req, res) => {
  const { amount, currency = 'usd', paymentMethodId, description } = req.body;

  if (!amount || amount <= 0) throw new ApiError(400, 'Valid amount is required');

  // Stripe payment intent creation
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) {
    // Fallback: simulate direct credit addition
    const user = await User.findByIdAndUpdate(
      (req as any).user._id,
      { $inc: { balance: amount } },
      { new: true }
    );
    return sendSuccess(res, {
      message: 'Payment simulated (no Stripe key configured). Balance updated.',
      balance: user?.balance,
      transaction: {
        id: `txn_${Date.now()}`,
        amount,
        currency,
        status: 'completed',
        description: description || 'Credit top-up',
      },
    });
  }

  // Real Stripe integration
  try {
    const stripe = require('stripe')(stripeKey);
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // cents
      currency,
      paymentMethod: paymentMethodId,
      description,
      confirm: !!paymentMethodId,
      metadata: { userId: (req as any).user._id.toString() },
    });

    sendSuccess(res, {
      message: 'Payment intent created',
      clientSecret: paymentIntent.client_secret,
      transaction: {
        id: paymentIntent.id,
        amount,
        currency,
        status: paymentIntent.status,
      },
    });
  } catch (stripeError: any) {
    throw new ApiError(500, `Stripe error: ${stripeError.message}`);
  }
}));

export default router;
