import { Schema } from 'mongoose'
import { IPromoCode } from './promoCode.types'

export const PromoCodeSchema = new Schema<IPromoCode>(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    type: { type: String, enum: ['percentage', 'fixed'], required: true },
    discount: { type: Number, required: true, min: 0 },
    maxUses: { type: Number, default: 1, min: 1 },
    usedCount: { type: Number, default: 0, min: 0 },
    minAmount: { type: Number, min: 0 },
    maxDiscount: { type: Number, min: 0 },
    expiresAt: { type: Date },
    isActive: { type: Boolean, default: true },
    usedBy: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true }
)

PromoCodeSchema.index({ code: 1 })
PromoCodeSchema.index({ isActive: 1, expiresAt: 1 })
