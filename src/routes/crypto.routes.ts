import { Router } from 'express';
import * as cryptoCtrl from '@/controllers/crypto.controller';
import { authMiddleware } from '@/middlewares/auth.middleware';

const router = Router();

// Config
router.get('/config', authMiddleware, cryptoCtrl.getConfig);
router.post('/config', authMiddleware, cryptoCtrl.createOrUpdateConfig);
router.delete('/config', authMiddleware, cryptoCtrl.deleteConfig);

// Deposits
router.get('/deposits', authMiddleware, cryptoCtrl.getDeposits);
router.post('/deposits', authMiddleware, cryptoCtrl.createDeposit);

// Payouts
router.get('/payout', authMiddleware, cryptoCtrl.getPayouts);
router.post('/payout', authMiddleware, cryptoCtrl.createPayout);

export default router;
