import { Router } from 'express';
import crypto from 'crypto';
import asyncHandler from '@/utils/asyncHandler';
import { sendSuccess } from '@/utils/response';
import { User } from '@/models/User';

const router = Router();

// Stripe webhook - signature verified by bodyParser being raw buffer
router.post('/stripe', asyncHandler(async (req, res) => {
  const sig = req.headers['stripe-signature'] as string;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

  if (!sig || !webhookSecret) {
    return sendSuccess(res, { received: true, note: 'no-verification' });
  }

  const parts = sig.split(',');
  const timePart = parts.find((p: string) => p.startsWith('t='));
  const sigPart = parts.find((p: string) => p.startsWith('v1='));
  if (!timePart || !sigPart) return sendSuccess(res, { received: true, error: 'invalid-signature' });

  const timestamp = timePart.substring(2);
  const signature = sigPart.substring(3);
  const payload = `${timestamp}.${(req as any).rawBody}`;
  const expectedSig = crypto.createHmac('sha256', webhookSecret).update(payload).digest('hex');

  if (crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig))) {
    sendSuccess(res, { received: true, verified: true });
  } else {
    sendSuccess(res, { received: true, error: 'signature-mismatch' });
  }
}));

// Email webhook (SendGrid, SES, etc.)
router.post('/email', asyncHandler(async (req, res) => {
  const { event, email, type, data } = req.body;
  sendSuccess(res, { received: true, event, email, type, data });
}));

export default router;
