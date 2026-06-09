import { Router } from 'express';
import { getApiKeys, createApiKey, deleteApiKey, regenerateApiKey, getUserPackages, updateUserPackageAutoRenew, cancelUserPackage, getActivity, getStats } from '@/controllers/dashboard.controller';
import { authMiddleware } from '@/middlewares/auth.middleware';

const router = Router();

router.get('/api-keys', authMiddleware, getApiKeys);
router.post('/api-keys', authMiddleware, createApiKey);
router.delete('/api-keys', authMiddleware, deleteApiKey);
router.put('/api-keys/:id', authMiddleware, regenerateApiKey);

router.get('/packages', authMiddleware, getUserPackages);
router.patch('/package', authMiddleware, updateUserPackageAutoRenew);
router.delete('/package', authMiddleware, cancelUserPackage);

router.get('/activities', authMiddleware, getActivity);
router.get('/stats', authMiddleware, getStats);

export default router;
