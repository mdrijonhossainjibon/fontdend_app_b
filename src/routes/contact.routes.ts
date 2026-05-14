import { Router, Request, Response } from 'express';
import asyncHandler from '@/utils/asyncHandler';
import { sendSuccess } from '@/utils/response';

const router = Router();

router.post('/', asyncHandler(async (req: Request, res: Response) => {
  const { name, email, subject, message } = req.body;
  if (!name || !email || !message) {
    return sendSuccess(res, { message: 'Name, email, and message are required' });
  }
  sendSuccess(res, { message: 'Message received. We will get back to you soon.' });
}));

export default router;
