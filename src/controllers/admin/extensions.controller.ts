import { Request, Response } from 'express';
import asyncHandler from '@/utils/asyncHandler';
import { sendSuccess } from '@/utils/response';
import { connectDB } from '@/config';
import { Extension } from '@/models/Extension';

export const list = asyncHandler(async (req: Request, res: Response) => {
  await connectDB();
  const extensions = await Extension.find().sort({ createdAt: -1 }).lean();
  sendSuccess(res, { extensions, total: extensions.length });
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  await connectDB();
  const ext = await Extension.create(req.body);
  sendSuccess(res, { message: 'Extension created', data: ext }, 201);
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  await connectDB();
  const ext = await Extension.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true });
  sendSuccess(res, { message: 'Extension updated', data: ext });
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  await connectDB();
  await Extension.findByIdAndDelete(req.params.id);
  sendSuccess(res, { message: 'Extension deleted' });
});
