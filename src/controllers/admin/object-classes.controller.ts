import { Request, Response } from 'express';
import asyncHandler from '@/utils/asyncHandler';
import { ApiError } from '@/utils/ApiError';
import { sendSuccess } from '@/utils/response';
import { connectDB } from '@/config';
import { ObjectClass } from '@/models';

export const list = asyncHandler(async (req: Request, res: Response) => {
  await connectDB();
  const classes = await ObjectClass.find().sort({ name: 1 }).lean();
  sendSuccess(res, { objectClasses: classes });
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  await connectDB();
  const { name, description, examples } = req.body;
  if (!name) throw new ApiError(400, 'Name is required');

  const objectClass = await ObjectClass.create({ name, description, examples: examples || [] });
  sendSuccess(res, { message: 'Object class created', data: objectClass }, 201);
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  await connectDB();
  const objectClass = await ObjectClass.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true });
  if (!objectClass) throw new ApiError(404, 'Object class not found');
  sendSuccess(res, { message: 'Object class updated', data: objectClass });
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  await connectDB();
  const objectClass = await ObjectClass.findByIdAndDelete(req.params.id);
  if (!objectClass) throw new ApiError(404, 'Object class not found');
  sendSuccess(res, { message: 'Object class deleted' });
});
