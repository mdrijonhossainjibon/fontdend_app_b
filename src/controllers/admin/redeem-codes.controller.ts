import { Request, Response } from 'express';
import { PromoCode } from '@/models/PromoCode';

const mapCode = (doc: any) => ({
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
});

export const list = async (req: Request, res: Response) => {
  try {
    const codes = await PromoCode.find().sort({ createdAt: -1 });
    res.json({ success: true, data: codes.map(mapCode) });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const create = async (req: Request, res: Response) => {
  try {
    const { code, credits, maxUses, expiresAt } = req.body;
    const exists = await PromoCode.findOne({ code: code.toUpperCase() });
    if (exists) {
      res.status(400).json({ success: false, error: 'Code already exists' });
      return;
    }
    const doc = await PromoCode.create({ code, credits, maxUses, expiresAt: expiresAt || undefined });
    res.json({ success: true, data: mapCode(doc) });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const update = async (req: Request, res: Response) => {
  try {
    const { id, isActive, credits, maxUses, expiresAt, resetUsedBy } = req.body;
    const update: any = {};
    if (isActive !== undefined) update.isActive = isActive;
    if (credits !== undefined) update.credits = credits;
    if (maxUses !== undefined) update.maxUses = maxUses;
    if (expiresAt !== undefined) update.expiresAt = expiresAt || null;
    if (resetUsedBy) update.currentUses = 0;

    const doc = await PromoCode.findByIdAndUpdate(id, update, { new: true });
    if (!doc) {
      res.status(404).json({ success: false, error: 'Code not found' });
      return;
    }
    res.json({ success: true, data: mapCode(doc) });
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
