import { Schema } from 'mongoose'
import { IPricingPlan } from './pricingPlan.types'

export const PricingPlanSchema = new Schema<IPricingPlan>(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, unique: true, trim: true },
    description: { type: String, default: '' },
    price: { type: Number, required: true, min: 0 },
    credits: { type: Number, required: true, min: 0 },
    type: { type: String, enum: ['free', 'basic', 'premium', 'enterprise'], required: true },
    billingCycle: { type: String, enum: ['monthly', 'yearly', 'one_time'], default: 'monthly' },
    features: { type: [String], default: [] },
    limits: { type: Schema.Types.Mixed, default: {} },
    isActive: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
    popular: { type: Boolean, default: false },
  },
  { timestamps: true }
)
PricingPlanSchema.index({ code: 1 })
PricingPlanSchema.index({ isActive: 1, sortOrder: 1 })
