import { Request, Response } from 'express';
import asyncHandler from '@/utils/asyncHandler';
import { ApiError } from '@/utils/ApiError';
import { sendSuccess } from '@/utils/response';
import { connectDB } from '@/config';
import { EmailTemplate } from '@/models/EmailTemplate';

export const list = asyncHandler(async (req: Request, res: Response) => {
  await connectDB();
  const templates = await EmailTemplate.find().sort({ name: 1 }).lean();
  sendSuccess(res, { emailTemplates: templates });
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  await connectDB();
  const { name, subject, body, variables } = req.body;
  if (!name || !subject || !body) throw new ApiError(400, 'Name, subject, and body are required');

  const template = await EmailTemplate.create({ name, subject, body, variables: variables || [] });
  sendSuccess(res, { message: 'Email template created', data: template }, 201);
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  await connectDB();
  const template = await EmailTemplate.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true });
  if (!template) throw new ApiError(404, 'Email template not found');
  sendSuccess(res, { message: 'Email template updated', data: template });
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  await connectDB();
  const template = await EmailTemplate.findByIdAndDelete(req.params.id);
  if (!template) throw new ApiError(404, 'Email template not found');
  sendSuccess(res, { message: 'Email template deleted' });
});
