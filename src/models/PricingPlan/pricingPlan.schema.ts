import { Schema } from 'mongoose'
import { IPricingPlan } from './pricingPlan.types'

export const PricingPlanSchema = new Schema<IPricingPlan>(
  {
    code: { type: String, required: true, unique: true, trim: true, uppercase: true },
    type: { type: String, enum: ['count', 'daily', 'minute'], required: true, index: true },
    price: { type: Number, required: true, min: 0 },
    priceDisplay: { type: String, required: true },
    validity: { type: String, required: true, default: '30d' },
    validityDays: { type: Number, required: true, default: 30 },
    recognition: { type: String, required: true, default: 'Image' },
    count: { type: Number, min: 0 },
    dailyLimit: { type: Number, min: 0 },
    rateLimit: { type: Number, min: 0 },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
)
PricingPlanSchema.index({ code: 1 })
PricingPlanSchema.index({ status: 1, sortOrder: 1 })
