import { Request, Response } from 'express';
import asyncHandler from '@/utils/asyncHandler';
import { ApiError } from '@/utils/ApiError';
import { sendSuccess } from '@/utils/response';
import { connectDB } from '@/config';
import { EmailTemplate } from '@/models/EmailTemplate';

export const list = asyncHandler(async (req: Request, res: Response) => {
  await connectDB();
  const templates = await EmailTemplate.find().sort({ name: 1 }).lean();
  sendSuccess(res, { templates });
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  await connectDB();
  const { name, subject, content, description } = req.body;
  if (!name || !subject || !content) throw new ApiError(400, 'Name, subject, and content are required');

  const template = await EmailTemplate.create({ name, subject, content, description: description || '' });
  sendSuccess(res, { message: 'Email template created', template }, 201);
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  await connectDB();
  const template = await EmailTemplate.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true });
  if (!template) throw new ApiError(404, 'Email template not found');
  sendSuccess(res, { message: 'Email template updated', template });
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  await connectDB();
  const template = await EmailTemplate.findByIdAndDelete(req.params.id);
  if (!template) throw new ApiError(404, 'Email template not found');
  sendSuccess(res, { message: 'Email template deleted' });
});
