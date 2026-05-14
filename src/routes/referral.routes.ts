import { Router } from 'express';
import { getReferralStats, getReferralList } from '@/controllers/referral.controller';
import { authMiddleware } from '@/middlewares/auth.middleware';

const router = Router();

router.get('/stats', authMiddleware, getReferralStats);
router.get('/list', authMiddleware, getReferralList);

export default router;
