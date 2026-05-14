import { Request, Response } from 'express';
import asyncHandler from '@/utils/asyncHandler';
import { sendSuccess } from '@/utils/response';
import { Extension } from '@/models/Extension';

export const list = asyncHandler(async (_req: Request, res: Response) => {
  const extensions = await Extension.find({ isActive: true })
    .sort({ createdAt: -1 })
    .lean();
 
  sendSuccess(res, { extensions });
});
