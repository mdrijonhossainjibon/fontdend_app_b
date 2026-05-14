import { Router } from 'express';
import { login, register, verifyOtp, logout, getMe, updateMe, forgotPassword, verifyResetToken, resetPassword, changePassword, googleInitiate, googleCallback, googleExchangeToken, githubInitiate, githubCallback } from '@/controllers';
import { authMiddleware } from '@/middlewares/auth.middleware';

const router = Router();

// ─────────────────────────────────────────────────────────────────────────────
// Local auth
// ─────────────────────────────────────────────────────────────────────────────
router.post('/login', login);
router.post('/register', register);
router.post('/verify-otp', verifyOtp);
router.post('/logout', logout);

// ─────────────────────────────────────────────────────────────────────────────
// Protected
// ─────────────────────────────────────────────────────────────────────────────
router.get('/me', authMiddleware, getMe);
router.patch('/me', authMiddleware, updateMe);
router.post('/change-password', authMiddleware, changePassword);

// ─────────────────────────────────────────────────────────────────────────────
// Password reset
// ─────────────────────────────────────────────────────────────────────────────
router.post('/forgot-password', forgotPassword);
router.get('/reset-password/verify', verifyResetToken);
router.post('/reset-password', resetPassword);

// ─────────────────────────────────────────────────────────────────────────────
// Google OAuth
// ─────────────────────────────────────────────────────────────────────────────
router.post('/google', googleExchangeToken);
router.get('/google', googleInitiate);
router.get('/callback/google', googleCallback);

// ─────────────────────────────────────────────────────────────────────────────
// GitHub OAuth
// ─────────────────────────────────────────────────────────────────────────────
router.get('/github', githubInitiate);
router.get('/github/callback', githubCallback);

export default router;
