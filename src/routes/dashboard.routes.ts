import { Router } from 'express';
import { getApiKeys, createApiKey, deleteApiKey, regenerateApiKey, getPackages, updatePackageAutoRenew, cancelPackage, getActivity, getStats } from '@/controllers/dashboard.controller';
import { authMiddleware } from '@/middlewares/auth.middleware';

const router = Router();

router.get('/api-keys', authMiddleware, getApiKeys);
router.post('/api-keys', authMiddleware, createApiKey);
router.delete('/api-keys', authMiddleware, deleteApiKey);
router.put('/api-keys/:id', authMiddleware, regenerateApiKey);

router.get('/packages', authMiddleware, getPackages);
router.patch('/package', authMiddleware, updatePackageAutoRenew);
router.delete('/package', authMiddleware, cancelPackage);

router.get('/activities', authMiddleware, getActivity);
router.get('/stats', authMiddleware, getStats);

export default router;
