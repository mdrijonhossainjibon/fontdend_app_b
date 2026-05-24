import { Request, Response } from 'express';
import asyncHandler from '@/utils/asyncHandler';
import { sendSuccess } from '@/utils/response';
import { connectDB } from '@/config';
import { PromoOffer } from '@/models/PromoOffer';

const DEFAULT_PROMO_OFFERS = [
  {
    title: 'Summer Sale',
    badge: 'Limited Time',
    description: 'Get 50% off on all yearly plans with priority support',
    features: ['50% Discount', 'Priority Support', 'Free Setup', 'Unlimited Requests'],
    highlight: 'Most Popular',
    pricingPlanCode: 'PRO_YEARLY',
    isActive: true,
    sortOrder: 1,
  },
  {
    title: 'Starter Bonus',
    badge: 'New Users',
    description: 'Start your journey with double credits on your first purchase',
    features: ['Double Credits', 'Extended Validity', '24/7 Support'],
    highlight: 'Best Value',
    pricingPlanCode: 'STARTER',
    isActive: true,
    sortOrder: 2,
  },
  {
    title: 'Enterprise Deal',
    badge: 'Exclusive',
    description: 'Custom enterprise solutions with dedicated account manager',
    features: ['Dedicated Manager', 'Custom SLA', 'Unlimited API', 'White Label'],
    highlight: 'Premium',
    pricingPlanCode: 'ENTERPRISE',
    isActive: true,
    sortOrder: 3,
  },
];

async function seedDefaultPromoOffers() {
  const count = await PromoOffer.countDocuments();
  if (count === 0) {
    await PromoOffer.insertMany(DEFAULT_PROMO_OFFERS);
    console.log('[seed] Default promo offers created');
  }
}

export const listPromoOffers = asyncHandler(async (req: Request, res: Response) => {
  await connectDB();
  await seedDefaultPromoOffers();
  const offers = await PromoOffer.find().sort({ sortOrder: 1, createdAt: -1 }).lean();
  sendSuccess(res, { offers });
});

export const createPromoOffer = asyncHandler(async (req: Request, res: Response) => {
  await connectDB();
  const offer = await PromoOffer.create({
    title: req.body.title,
    badge: req.body.badge || '',
    description: req.body.description || '',
    features: req.body.features || [],
    highlight: req.body.highlight || '',
    pricingPlanCode: req.body.pricingPlanCode,
    isActive: req.body.isActive !== undefined ? req.body.isActive : true,
    sortOrder: req.body.sortOrder || 0,
  });
  sendSuccess(res, { offer }, 201);
});

export const updatePromoOffer = asyncHandler(async (req: Request, res: Response) => {
  await connectDB();
  const { offerId, ...updateData } = req.body;
  if (!offerId) {
    res.status(400).json({ success: false, error: 'offerId is required' });
    return;
  }
  const updateFields: any = {};
  if (updateData.title !== undefined) updateFields.title = updateData.title;
  if (updateData.badge !== undefined) updateFields.badge = updateData.badge;
  if (updateData.description !== undefined) updateFields.description = updateData.description;
  if (updateData.features !== undefined) updateFields.features = updateData.features;
  if (updateData.highlight !== undefined) updateFields.highlight = updateData.highlight;
  if (updateData.pricingPlanCode !== undefined) updateFields.pricingPlanCode = updateData.pricingPlanCode;
  if (updateData.isActive !== undefined) updateFields.isActive = updateData.isActive;
  if (updateData.sortOrder !== undefined) updateFields.sortOrder = updateData.sortOrder;
  await PromoOffer.findByIdAndUpdate(offerId, { $set: updateFields });
  sendSuccess(res, { message: 'Promo offer updated' });
});

export const removePromoOffer = asyncHandler(async (req: Request, res: Response) => {
  await connectDB();
  const { offerId } = req.query;
  if (!offerId) {
    res.status(400).json({ success: false, error: 'offerId is required' });
    return;
  }
  await PromoOffer.findByIdAndDelete(offerId);
  sendSuccess(res, { message: 'Promo offer deleted' });
});
