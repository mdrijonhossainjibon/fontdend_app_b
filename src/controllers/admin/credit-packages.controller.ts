import { Request, Response } from 'express';
import asyncHandler from '@/utils/asyncHandler';
import { sendSuccess } from '@/utils/response';
import { connectDB } from '@/config';
import { CreditPackage } from '@/models/CreditPackage';

export const list = asyncHandler(async (req: Request, res: Response) => {
  await connectDB();
  const filter: any = {};
  if (req.query.type && req.query.type !== 'all') {
    filter.type = req.query.type;
  }
  if (req.query.isActive !== undefined) {
    filter.isActive = req.query.isActive === 'true';
  }
  const packages = await CreditPackage.find(filter).sort({ sortOrder: 1, price: 1 }).lean();
  const total = await CreditPackage.countDocuments();
  const active = await CreditPackage.countDocuments({ isActive: true });
  const oneTime = await CreditPackage.countDocuments({ type: 'one_time' });
  const subscription = await CreditPackage.countDocuments({ type: 'subscription' });
  sendSuccess(res, { packages, stats: { total, active, oneTime, subscription } });
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  await connectDB();
  const pkg = await CreditPackage.create({
    name: req.body.name,
    code: req.body.code,
    credits: Number(req.body.credits),
    price: Number(req.body.price),
    discountPrice: req.body.discountPrice ? Number(req.body.discountPrice) : undefined,
    type: req.body.type || 'one_time',
    billingCycle: req.body.billingCycle || undefined,
    features: req.body.features || [],
    isActive: req.body.isActive !== undefined ? req.body.isActive : true,
    sortOrder: req.body.sortOrder || 0,
  });
  sendSuccess(res, { package: pkg }, 201);
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  await connectDB();
  const { packageId, ...updateData } = req.body;
  if (!packageId) {
    res.status(400).json({ success: false, error: 'packageId is required' });
    return;
  }
  const updateFields: any = {};
  if (updateData.name !== undefined) updateFields.name = updateData.name;
  if (updateData.code !== undefined) updateFields.code = updateData.code;
  if (updateData.credits !== undefined) updateFields.credits = Number(updateData.credits);
  if (updateData.price !== undefined) updateFields.price = Number(updateData.price);
  if (updateData.discountPrice !== undefined) updateFields.discountPrice = Number(updateData.discountPrice);
  if (updateData.type !== undefined) updateFields.type = updateData.type;
  if (updateData.billingCycle !== undefined) updateFields.billingCycle = updateData.billingCycle;
  if (updateData.features !== undefined) updateFields.features = updateData.features;
  if (updateData.isActive !== undefined) updateFields.isActive = updateData.isActive;
  if (updateData.sortOrder !== undefined) updateFields.sortOrder = updateData.sortOrder;
  await CreditPackage.findByIdAndUpdate(packageId, { $set: updateFields });
  sendSuccess(res, { message: 'Credit package updated' });
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  await connectDB();
  const { packageId } = req.query;
  if (!packageId) {
    res.status(400).json({ success: false, error: 'packageId is required' });
    return;
  }
  await CreditPackage.findByIdAndDelete(packageId);
  sendSuccess(res, { message: 'Credit package deleted' });
});
