import { Router } from 'express';
import {
  getActivePackage,
  buyCredits,
  redeemCode,
  getHistory,
} from '@/controllers/topup.controller';
import { authMiddleware } from '@/middlewares/auth.middleware';

const router = Router();

router.get('/active-package', authMiddleware, getActivePackage);
router.post('/credits', authMiddleware, buyCredits);
router.post('/redeem', authMiddleware, redeemCode);
router.get('/history', authMiddleware, getHistory);

export default router;

