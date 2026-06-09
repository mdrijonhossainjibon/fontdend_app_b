import { Schema } from 'mongoose'
import { ICreditPackage } from './creditPackage.types'

export const CreditPackageSchema = new Schema<ICreditPackage>(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, unique: true, trim: true },
    credits: { type: Number, required: true, min: 0 },
    price: { type: Number, required: true, min: 0 },
    discountPrice: { type: Number, min: 0 },
    type: { type: String, enum: ['one_time', 'subscription'], default: 'one_time' },
    billingCycle: { type: String, enum: ['monthly', 'yearly'] },
    features: { type: [String], default: [] },
    isActive: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
)
CreditPackageSchema.index({ code: 1 })
CreditPackageSchema.index({ isActive: 1, sortOrder: 1 })
