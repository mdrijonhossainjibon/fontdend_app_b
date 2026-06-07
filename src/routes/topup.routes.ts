import { Router } from 'express';
import {
  getActivePackage,
  getPendingDeposit,
  buyCredits,
  redeemCode,
  getHistory,
  createCryptomusInvoice,
  getInvoice,
} from '@/controllers/topup.controller';
import { authMiddleware } from '@/middlewares/auth.middleware';

const router = Router();

router.get('/active-package', authMiddleware, getActivePackage);
router.get('/pending-deposit', authMiddleware, getPendingDeposit);
router.post('/credits', authMiddleware, buyCredits);
router.post('/redeem', authMiddleware, redeemCode);
router.get('/history', authMiddleware, getHistory);
router.post('/cryptomus/create-invoice', authMiddleware, createCryptomusInvoice);
router.get('/invoice/:invoiceId', authMiddleware, getInvoice);

export default router;

