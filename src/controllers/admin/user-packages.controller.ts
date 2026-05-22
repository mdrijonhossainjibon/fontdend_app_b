import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { Package } from '../../models/Package';
import { PricingPlan } from '../../models/PricingPlan';
import { User } from '../../models/User';
import asyncHandler from '../../utils/asyncHandler';
import { sendSuccess, sendError } from '../../utils/response';
import { ApiError } from '../../utils/ApiError';

export const list = asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req.query;
    if (!userId) return sendError(res, 400, 'userId is required');

    const packages = await Package.find({ userId }).sort({ createdAt: -1 });
    sendSuccess(res, { packages });
});

export const update = asyncHandler(async (req: Request, res: Response) => {
    const { packageId, credits } = req.body;
    if (!packageId) return sendError(res, 400, 'packageId is required');

    const pkg = await Package.findById(packageId);
    if (!pkg) return sendError(res, 404, 'Package not found');

    if (credits !== undefined) pkg.credits = credits;
    await pkg.save();

    sendSuccess(res, { message: 'Package updated successfully', package: pkg });
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
    const { packageId } = req.query;
    if (!packageId) return sendError(res, 400, 'packageId is required');

    const pkg = await Package.findByIdAndDelete(packageId);
    if (!pkg) return sendError(res, 404, 'Package not found');

    sendSuccess(res, { message: 'Package removed successfully' });
});

export const assignPackage = asyncHandler(async (req: Request, res: Response) => {
    const { userId, planId, freeTrial, trialDays, trialCredits } = req.body;
    if (!userId) return sendError(res, 400, 'userId is required');

    const user = await User.findById(userId);
    if (!user) return sendError(res, 404, 'User not found');

    let planData: any = {};

    if (freeTrial) {
        planData = {
            packageCode: 'FREE_TRIAL',
            type: 'count',
            name: 'Free Trial',
            price: 0,
            credits: trialCredits || 100,
            features: ['Free trial package'],
            startDate: new Date(),
            endDate: new Date(Date.now() + (trialDays || 7) * 24 * 60 * 60 * 1000),
        };
    } else {
        if (!planId) return sendError(res, 400, 'planId is required');
        const plan = await PricingPlan.findById(planId);
        if (!plan) return sendError(res, 404, 'Pricing plan not found');

        const price = plan.price || 0;

        // Check if user has enough balance
        if (user.balance < price) {
            return sendError(res, 400, `Insufficient balance. Required: $${price}, Available: $${user.balance}`);
        }

        let validityDays = 30;
        switch (plan.validity) {
            case '1 day': validityDays = 1; break;
            case '7 days': validityDays = 7; break;
            case '15 days': validityDays = 15; break;
            case '30 days': validityDays = 30; break;
            case '60 days': validityDays = 60; break;
            case '90 days': validityDays = 90; break;
            case '180 days': validityDays = 180; break;
            case '365 days': validityDays = 365; break;
            default: validityDays = plan.validityDays || 30;
        }

        const count = plan.count || 0;
        const dailyLimit = plan.dailyLimit || 0;
        const rateLimit = plan.rateLimit || 0;

        planData = {
            packageCode: plan.code || plan._id.toString(),
            type: count > 0 ? 'count' : 'daily',
            name: plan.priceDisplay || plan.type,
            price: price,
            credits: count || dailyLimit || 0,
            features: [`${count || dailyLimit} recognitions`, `Rate limit: ${rateLimit || 'N/A'}`, `Validity: ${plan.validity}`],
            startDate: new Date(),
            endDate: new Date(Date.now() + validityDays * 24 * 60 * 60 * 1000),
        };

        // Deduct balance from user
        user.balance -= price;
        await user.save();
    }

    const newPackage = await Package.create({
        userId,
        ...planData,
    });

    sendSuccess(res, {
        message: 'Package assigned successfully',
        package: newPackage,
        balance: user.balance,
    });
});
