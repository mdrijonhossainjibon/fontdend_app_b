import { Request, Response } from 'express';
import asyncHandler from '@/utils/asyncHandler';
import { sendSuccess } from '@/utils/response';
import { connectDB } from '@/config';
import { SystemSetting, SmtpSetting } from '@/models';

export const getSiteSettings = asyncHandler(async (req: Request, res: Response) => {
  await connectDB();
  const settings = await SystemSetting.findOne().sort({ createdAt: -1 });
  sendSuccess(res, { settings: settings || {} });
});

export const updateSiteSettings = asyncHandler(async (req: Request, res: Response) => {
  await connectDB();
  const settings = await SystemSetting.findOneAndUpdate({}, { $set: req.body }, { new: true, upsert: true });
  sendSuccess(res, { message: 'Settings updated', settings });
});

export const getSmtpSettings = asyncHandler(async (req: Request, res: Response) => {
  await connectDB();
  const settings = await SmtpSetting.findOne().sort({ createdAt: -1 });
  sendSuccess(res, { settings: settings || {} });
});

export const updateSmtpSettings = asyncHandler(async (req: Request, res: Response) => {
  await connectDB();
  const settings = await SmtpSetting.findOneAndUpdate({}, { $set: req.body }, { new: true, upsert: true });
  sendSuccess(res, { message: 'SMTP settings updated', settings });
});
