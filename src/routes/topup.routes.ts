import { Router } from 'express';
import {
  getActiveUserPackage,
  getPendingDeposit,
  buyCredits,
  redeemCode,
  getHistory,
  createCryptomusInvoice,
  getInvoice,
  cancelDeposit,
  checkTopupPayment,
} from '@/controllers/topup.controller';
import { authMiddleware } from '@/middlewares/auth.middleware';

const router = Router();

router.get('/active-package', authMiddleware, getActiveUserPackage);
router.get('/pending-deposit', authMiddleware, getPendingDeposit);
router.post('/credits', authMiddleware, buyCredits);
router.post('/redeem', authMiddleware, redeemCode);
router.get('/history', authMiddleware, getHistory);
router.post('/cryptomus/create-invoice', authMiddleware, createCryptomusInvoice);
router.get('/invoice/:invoiceId', authMiddleware, getInvoice);
router.post('/cancel-deposit', authMiddleware, cancelDeposit);
router.post('/check-payment', authMiddleware, checkTopupPayment);

export default router;

