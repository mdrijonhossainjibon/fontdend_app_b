import mongoose, { Schema, Document } from 'mongoose';

export interface IPromoCode extends Document {
  code: string;
  credits: number;
  maxUses: number;
  currentUses: number;
  expiresAt: Date | null;
  isActive: boolean;
  createdAt: Date;
}

const PromoCodeSchema = new Schema<IPromoCode>(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    credits: { type: Number, required: true },
    maxUses: { type: Number, default: 1 },
    currentUses: { type: Number, default: 0 },
    expiresAt: { type: Date, default: null },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const PromoCode = mongoose.model<IPromoCode>('PromoCode', PromoCodeSchema);
