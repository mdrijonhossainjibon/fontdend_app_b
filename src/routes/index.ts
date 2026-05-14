import { Router } from 'express';
import authRoutes from './auth.routes';
import adminRoutes from './admin.routes';
import dashboardRoutes from './dashboard.routes';
import pricingRoutes from './pricing.routes';
import solveRoutes from './solve.routes';
import cryptoRoutes from './crypto.routes';
import uploadRoutes from './upload.routes';
import contactRoutes from './contact.routes';
import paymentRoutes from './payment.routes';
import webhookRoutes from './webhook.routes';
import extensionsRoutes from './extensions.routes';
import topupRoutes from './topup.routes';
import referralRoutes from './referral.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/admin', adminRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/pricing', pricingRoutes);
router.use('/solve', solveRoutes);
router.use('/crypto', cryptoRoutes);
router.use('/upload', uploadRoutes);
router.use('/contact', contactRoutes);
router.use('/payment', paymentRoutes);
router.use('/webhook', webhookRoutes);
router.use('/extensions', extensionsRoutes);
router.use('/topup', topupRoutes);
router.use('/referrals', referralRoutes);

export default router;
