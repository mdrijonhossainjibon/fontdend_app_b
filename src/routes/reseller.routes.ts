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
  claimCoupon,
  validateCoupon,
} from '@/controllers/reseller.controller';

const router = Router();

router.use(authMiddleware, resellerMiddleware);

router.get('/stats', getDashboardStats);
router.get('/packages', getPackages);
router.delete('/packages/:id', deletePackage);
router.get('/pricing-plans', getPricingPlans);
router.get('/coupon/claim', claimCoupon);
router.post('/validate-coupon', validateCoupon);
router.post('/purchase/:planId', purchasePackage);
router.get('/api-keys', getApiKeys);
router.post('/api-keys', createApiKey);
router.delete('/api-keys/:id', deleteApiKey);
router.put('/api-keys/:id/regenerate', regenerateApiKey);

// Docs
router.get('/docs', (_req, res) => {
  const baseUrl = 'https://captchamaster.org/api';
  res.json({
    title: 'Reseller API Documentation',
    version: '1.0.0',
    baseUrl,
    baseUrlDescription: 'All endpoints are relative to this base URL. The API automatically uses your current domain.',
    authentication: {
      type: 'Bearer Token',
      format: 'rk_live_xxxxxxxx...',
      header: 'Authorization: Bearer <your_api_key>',
    },
    endpoints: [
      {
        path: `${baseUrl}/reseller/stats`,
        method: 'GET',
        description: 'Get dashboard statistics (customers, API keys, credits)',
      },
      { path: `${baseUrl}/reseller/packages`, method: 'GET', description: 'Get all customer packages' },
      { path: `${baseUrl}/reseller/packages/:id`, method: 'DELETE', description: 'Delete a customer package' },
      { path: `${baseUrl}/reseller/pricing-plans`, method: 'GET', description: 'Get all active pricing plans' },
      { path: `${baseUrl}/reseller/coupon/claim`, method: 'GET', description: 'Claim $100 advance coupon' },
      { path: `${baseUrl}/reseller/validate-coupon`, method: 'POST', description: 'Validate a coupon code', body: { code: 'string (required)' } },
      { path: `${baseUrl}/reseller/purchase/:planId`, method: 'POST', description: 'Purchase a package for a customer', body: { customerEmail: 'string (optional)' } },
      { path: `${baseUrl}/reseller/api-keys`, method: 'GET', description: 'Get all API keys' },
      { path: `${baseUrl}/reseller/api-keys`, method: 'POST', description: 'Create a new API key', body: { name: 'string (required)' } },
      { path: `${baseUrl}/reseller/api-keys/:id`, method: 'DELETE', description: 'Delete an API key' },
      { path: `${baseUrl}/reseller/api-keys/:id/regenerate`, method: 'PUT', description: 'Regenerate an API key' },
    ],
  });
});

export default router;
