import { Request, Response } from 'express';
import asyncHandler from '@/utils/asyncHandler';
import { ApiError } from '@/utils/ApiError';
import { sendSuccess } from '@/utils/response';
import { PricingPlan } from '@/models/PricingPlan';
import { Package } from '@/models/Package';
import { PromoOffer } from '@/models/PromoOffer';
import { User } from '@/models/User';

export const getPlans = asyncHandler(async (req: Request, res: Response) => {
  const type = req.query.type as string;
  const query: Record<string, unknown> = { status: 'active' };
  if (type && type !== 'all') query.type = type;

  const pricingPlans = await PricingPlan.find(query)
    .sort({ type: 1, sortOrder: 1, price: 1 })
    .lean();

  const transformedPlans = pricingPlans.map((plan: any) => ({
    id: plan._id.toString(), type: plan.type, code: plan.code,
    price: plan.priceDisplay, priceValue: plan.price,
    validity: plan.validity, recognition: plan.recognition, isPromo: plan.isPromo,
    ...(plan.type === 'count' && { count: plan.count }),
    ...(plan.type === 'daily' && { dailyLimit: plan.dailyLimit }),
    ...(plan.type === 'minute' && { rateLimit: plan.rateLimit }),
  }));

  sendSuccess(res, { data: transformedPlans, count: transformedPlans.length });
});

export const subscribe = asyncHandler(async (req: Request, res: Response) => {
  const { planId, planCode } = req.body;

  if (!planId && !planCode) throw new ApiError(400, 'Plan ID or code is required');

  const query = planId ? { _id: planId } : { code: planCode.toUpperCase() };
  const pricingPlan = await PricingPlan.findOne({ ...query, status: 'active' });
  if (!pricingPlan) throw new ApiError(404, 'Pricing plan not found or inactive');

  const fullUser = await User.findById((req as any).user._id);
  if (!fullUser) throw new ApiError(404, 'User account not found');
  if (fullUser.balance < pricingPlan.price)
    throw new ApiError(400, `Insufficient balance. Required: $${pricingPlan.price.toFixed(2)}, Available: $${fullUser.balance.toFixed(2)}`);

  const startDate = new Date();
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + pricingPlan.validityDays);

  const packageData = {
    userId: (req as any).user._id,
    packageCode: pricingPlan.code,
    type: pricingPlan.type,
    name: `${pricingPlan.type.toUpperCase()} - ${pricingPlan.code}`,
    price: pricingPlan.price,
    billingCycle: 'monthly',
    credits: pricingPlan.count || pricingPlan.dailyLimit || pricingPlan.rateLimit,
    creditsUsed: 0,
    features: [
      `${pricingPlan.recognition} Recognition`,
      `${pricingPlan.validity} Validity`,
      pricingPlan.type === 'count' ? `${pricingPlan.count?.toLocaleString()} Total Requests` :
        pricingPlan.type === 'daily' ? `${pricingPlan.dailyLimit?.toLocaleString()} Requests/Day` :
          `${pricingPlan.rateLimit} Requests/Minute`,
    ],
    status: 'active', autoRenew: false, startDate, endDate,
  };

  const subscription = await Package.findOneAndUpdate(
    { userId: (req as any).user._id, status: 'active' },
    { $set: packageData },
    { new: true, upsert: true }
  );

  await User.findByIdAndUpdate((req as any).user._id, { $inc: { balance: -pricingPlan.price } });

  sendSuccess(res, {
    message: 'Subscription created successfully',
    data: {
      subscriptionId: subscription._id.toString(), planCode: pricingPlan.code,
      price: pricingPlan.priceDisplay, credits: pricingPlan.count,
      startDate: startDate.toISOString(), endDate: endDate.toISOString(),
    },
  });
});

export const getOffers = asyncHandler(async (_req: Request, res: Response) => {
  const promoOffers = await PromoOffer.find({ isActive: true })
    .sort({ sortOrder: 1, createdAt: -1 })
    .lean();

  const planCodes = promoOffers.map((o: any) => o.pricingPlanCode);
  const plans = await PricingPlan.find({ code: { $in: planCodes }, status: 'active' }).lean();
  const planMap = new Map(plans.map((p: any) => [p.code, p]));

  const offers = promoOffers.map((offer: any) => {
    const plan = planMap.get(offer.pricingPlanCode) as any;
    return {
      id: offer._id.toString(),
      code: offer.pricingPlanCode,
      type: plan?.type || 'count',
      price: plan?.priceDisplay || '$0.00',
      priceValue: plan?.price || 0,
      validity: plan?.validity || '',
      recognition: plan?.recognition || '',
      offerTitle: offer.title,
      offerBadge: offer.badge || '',
      offerDescription: offer.description || '',
      offerFeatures: offer.features || [],
      offerHighlight: offer.highlight || '',
      imageUrl: offer.image || '',
      ...(plan?.type === 'count' && { count: plan.count }),
      ...(plan?.type === 'daily' && { dailyLimit: plan.dailyLimit }),
      ...(plan?.type === 'minute' && { rateLimit: plan.rateLimit }),
    };
  });

  sendSuccess(res, { offers });
});
