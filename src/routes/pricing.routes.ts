import { Router } from 'express';
import { getPlans, subscribe, getOffers } from '@/controllers/pricing.controller';
import { authMiddleware } from '@/middlewares/auth.middleware';
import { apiRateLimiter } from '@/middlewares/rate-limit.middleware';

const router = Router();

router.get('/offers', apiRateLimiter, getOffers);
router.get('/', apiRateLimiter, getPlans);
router.post('/subscribe', authMiddleware, subscribe);

export default router;
