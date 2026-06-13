import { Router } from 'express';
import { authMiddleware, resellerMiddleware } from '@/middlewares/auth.middleware';
import {
  getDashboardStats,
  getPackages,
  deletePackage,
  getApiKeys,
  createApiKey,
  deleteApiKey,
  regenerateApiKey,
  purchasePackage,
  getPricingPlans,
} from '@/controllers/reseller.controller';

const router = Router();

router.use(authMiddleware, resellerMiddleware);

router.get('/stats', getDashboardStats);
router.get('/packages', getPackages);
router.delete('/packages/:id', deletePackage);
router.get('/pricing-plans', getPricingPlans);
router.post('/purchase/:planId', purchasePackage);
router.get('/api-keys', getApiKeys);
router.post('/api-keys', createApiKey);
router.delete('/api-keys/:id', deleteApiKey);
router.put('/api-keys/:id/regenerate', regenerateApiKey);

export default router;
