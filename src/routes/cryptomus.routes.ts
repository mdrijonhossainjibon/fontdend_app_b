import { Router } from 'express';
import { authMiddleware } from '@/middlewares/auth.middleware';
import { checkCryptomusPayment, getPaymentByOrderId, cryptomusWebhook } from '@/controllers/cryptomus.controller';

const router = Router();

// Webhook — called by Cryptomus (no auth, signature verified inside)
router.post('/webhook', cryptomusWebhook);

// Check payment status — called by frontend (user must be logged in)
router.get('/payment-status/:invoiceId', authMiddleware, checkCryptomusPayment);

// Lookup payment by order_id
router.get('/payment/:orderId', authMiddleware, getPaymentByOrderId);

export default router;
