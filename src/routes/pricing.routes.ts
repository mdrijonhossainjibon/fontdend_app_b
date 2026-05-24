import { Router } from 'express';
import { getPlans, subscribe, getOffers } from '@/controllers/pricing.controller';
import { authMiddleware } from '@/middlewares/auth.middleware';

const router = Router();

router.get('/offers', getOffers);
router.get('/', getPlans);
router.post('/subscribe', authMiddleware, subscribe);

export default router;
