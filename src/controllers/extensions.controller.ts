import { Request, Response } from 'express';
import asyncHandler from '@/utils/asyncHandler';
import { sendSuccess } from '@/utils/response';
import { Extension } from '@/models/Extension';

export const list = asyncHandler(async (req: Request, res: Response) => {
  const rawExtensions = await Extension.find({ isActive: true })
    .sort({ createdAt: -1 })
    .lean();

  const extensions = (rawExtensions || []).map((ext: any) => ({
    ...ext,
    downloadUrl: `${req.protocol}://${req.get('host')}/api/d/${ext.shortId || ext._id}`
  }));

  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  sendSuccess(res, { extensions });
});
