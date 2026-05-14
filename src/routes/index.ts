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
import { Extension } from '../models/Extension';

const router = Router();

// Short link redirection
router.get('/d/:shortId', async (req, res) => {
    try {
        const extension = await Extension.findOne({ shortId: req.params.shortId });
        if (!extension) return res.status(404).send('Extension not found');

        // Increase download count
        extension.downloads = (extension.downloads || 0) + 1;
        await extension.save();

        // Redirect to actual download URL
        // If the URL is relative, prepend the protocol and host
        let finalUrl = extension.downloadUrl;
        if (finalUrl.startsWith('/')) {
            finalUrl = `${req.protocol}://${req.get('host')}${finalUrl}`;
        }
        res.redirect(finalUrl);
    } catch (error) {
        console.error('Short link error:', error);
        res.status(500).send('Internal Server Error');
    }
});

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
