import { Request, Response } from 'express';
import asyncHandler from '@/utils/asyncHandler';
import { sendSuccess } from '@/utils/response';
import { connectDB } from '@/config';
import { PricingPlan } from '@/models/PricingPlan';

export const list = asyncHandler(async (req: Request, res: Response) => {
  await connectDB();
  const filter: any = {};
  if (req.query.type && req.query.type !== 'all') {
    filter.type = req.query.type;
  }
  const plans = await PricingPlan.find(filter).sort({ sortOrder: 1, price: 1 }).lean();
  const total = await PricingPlan.countDocuments();
  const count = await PricingPlan.countDocuments({ type: 'count' });
  const daily = await PricingPlan.countDocuments({ type: 'daily' });
  const minute = await PricingPlan.countDocuments({ type: 'minute' });
  const active = await PricingPlan.countDocuments({ status: 'active' });
  sendSuccess(res, {
    plans,
    stats: { total, count, daily, minute, active },
  });
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  await connectDB();
  const plan = await PricingPlan.create({
    code: req.body.code,
    type: req.body.type,
    price: Number(req.body.price),
    priceDisplay: `$${Number(req.body.price).toFixed(2)}`,
    validity: req.body.validity || '30d',
    validityDays: req.body.validityDays || 30,
    recognition: req.body.recognition || 'Image',
    count: req.body.count ? Number(req.body.count) : undefined,
    dailyLimit: req.body.dailyLimit ? Number(req.body.dailyLimit) : undefined,
    rateLimit: req.body.rateLimit ? Number(req.body.rateLimit) : undefined,
    status: req.body.status || 'active',
  });
  sendSuccess(res, { plan }, 201);
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  await connectDB();
  const { planId, ...updateData } = req.body;
  if (!planId) {
    res.status(400).json({ success: false, error: 'planId is required' });
    return;
  }
  const updateFields: any = {};
  if (updateData.price !== undefined) {
    updateFields.price = Number(updateData.price);
    updateFields.priceDisplay = `$${Number(updateData.price).toFixed(2)}`;
  }
  if (updateData.validity !== undefined) updateFields.validity = updateData.validity;
  if (updateData.validityDays !== undefined) updateFields.validityDays = updateData.validityDays;
  if (updateData.recognition !== undefined) updateFields.recognition = updateData.recognition;
  if (updateData.count !== undefined) updateFields.count = Number(updateData.count);
  if (updateData.dailyLimit !== undefined) updateFields.dailyLimit = Number(updateData.dailyLimit);
  if (updateData.rateLimit !== undefined) updateFields.rateLimit = Number(updateData.rateLimit);
  if (updateData.status !== undefined) updateFields.status = updateData.status;
  await PricingPlan.findByIdAndUpdate(planId, { $set: updateFields });
  sendSuccess(res, { message: 'Pricing plan updated' });
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  await connectDB();
  const { planId } = req.query;
  if (!planId) {
    res.status(400).json({ success: false, error: 'planId is required' });
    return;
  }
  await PricingPlan.findByIdAndDelete(planId);
  sendSuccess(res, { message: 'Pricing plan deleted' });
});
