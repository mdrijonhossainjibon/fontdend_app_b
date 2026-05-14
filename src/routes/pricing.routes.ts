import { Router } from 'express';
import { getPlans, subscribe } from '@/controllers/pricing.controller';
import { authMiddleware } from '@/middlewares/auth.middleware';

const router = Router();

router.get('/', getPlans);
router.post('/subscribe', authMiddleware, subscribe);

export default router;
