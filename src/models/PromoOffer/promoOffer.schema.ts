import { Schema } from 'mongoose'
import { IPromoOffer } from './promoOffer.types'

export const PromoOfferSchema = new Schema<IPromoOffer>(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    type: { type: String, enum: ['bonus_credits', 'discount', 'free_trial'], required: true },
    value: { type: Number, required: true, min: 0 },
    minPurchase: { type: Number, min: 0 },
    startsAt: { type: Date, required: true },
    expiresAt: { type: Date, required: true },
    isActive: { type: Boolean, default: true },
    termsConditions: { type: String },
    badge: { type: String, default: '' },
    features: { type: [String], default: [] },
    highlight: { type: String, default: '' },
    pricingPlanCode: { type: String, default: '' },
    sortOrder: { type: Number, default: 0 },
    image: { type: String, default: '' },
  },
  { timestamps: true }
)

PromoOfferSchema.index({ type: 1, isActive: 1 })
PromoOfferSchema.index({ startsAt: 1, expiresAt: 1 })
