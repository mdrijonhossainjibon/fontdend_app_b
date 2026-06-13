import { Router } from 'express';
import { authMiddleware } from '@/middlewares/auth.middleware';
import { checkCryptomusPayment, getPaymentByOrderId } from '@/controllers/cryptomus.controller';

const router = Router();

// Check payment status — called by frontend polling (user must be logged in)
router.get('/payment-status/:invoiceId', authMiddleware, checkCryptomusPayment);

// Lookup payment by order_id
router.get('/payment/:orderId', authMiddleware, getPaymentByOrderId);

export default router;
