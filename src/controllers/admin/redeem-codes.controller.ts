import { Request, Response } from 'express';
import { PromoCode } from '@/models/PromoCode';
import { PricingPlan } from '@/models/PricingPlan';

const mapCode = async (doc: any) => {
  let pkg: Record<string, any> | null = null;
  if (doc.packageId) {
    const plan: any = await PricingPlan.findById(doc.packageId).lean();
    if (plan) {
      pkg = {
        code: (plan as any).code,
        name: (plan as any).code,
        type: (plan as any).type,
        price: (plan as any).price,
        validityDays: (plan as any).validityDays,
        credits: (plan as any).count || 0,
      };
    }
  }
  return {
    id: doc._id,
    code: doc.code,
    credits: doc.credits,
    maxUses: doc.maxUses,
    usedCount: doc.currentUses || 0,
    usedByCount: 0,
    expiresAt: doc.expiresAt || null,
    isActive: doc.isActive,
    createdAt: doc.createdAt,
    createdBy: null,
    packageId: doc.packageId || null,
    package: pkg,
  };
};

export const list = async (req: Request, res: Response) => {
  try {
    const codes = await PromoCode.find().sort({ createdAt: -1 }).lean();
    const mapped = await Promise.all(codes.map(mapCode));
    res.json({ success: true, data: mapped });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const create = async (req: Request, res: Response) => {
  try {
    const { code, credits, maxUses, expiresAt, packageId } = req.body;
    const exists = await PromoCode.findOne({ code: code.toUpperCase() });
    if (exists) {
      res.status(400).json({ success: false, error: 'Code already exists' });
      return;
    }
    const payload: any = { code, credits, maxUses, expiresAt: expiresAt || undefined };
    if (packageId) payload.packageId = packageId;
    const doc = await PromoCode.create(payload);
    res.json({ success: true, data: await mapCode(doc) });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const update = async (req: Request, res: Response) => {
  try {
    const { id, isActive, credits, maxUses, expiresAt, resetUsedBy, packageId } = req.body;
    const update: any = {};
    if (isActive !== undefined) update.isActive = isActive;
    if (credits !== undefined) update.credits = credits;
    if (maxUses !== undefined) update.maxUses = maxUses;
    if (expiresAt !== undefined) update.expiresAt = expiresAt || null;
    if (resetUsedBy) update.currentUses = 0;
    if (packageId !== undefined) update.packageId = packageId || null;

    const doc = await PromoCode.findByIdAndUpdate(id, update, { new: true }).lean();
    if (!doc) {
      res.status(404).json({ success: false, error: 'Code not found' });
      return;
    }
    res.json({ success: true, data: await mapCode(doc) });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const remove = async (req: Request, res: Response) => {
  try {
    const { id } = req.query;
    await PromoCode.findByIdAndDelete(id);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};
