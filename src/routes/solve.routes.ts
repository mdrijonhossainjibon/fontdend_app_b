import { Router } from 'express';
import { solveCaptcha } from '@/controllers/solve.controller';
import { authMiddleware } from '@/middlewares/auth.middleware';

const router = Router();

router.post('/', authMiddleware, solveCaptcha);

export default router;
