import { Document } from 'mongoose'

export interface IPromoOffer extends Document {
  title: string
  description: string
  type: 'bonus_credits' | 'discount' | 'free_trial'
  value: number
  minPurchase?: number
  startsAt: Date
  expiresAt: Date
  isActive: boolean
  termsConditions?: string
  badge?: string
  features?: string[]
  highlight?: string
  pricingPlanCode?: string
  sortOrder?: number
  image?: string
  createdAt: Date
  updatedAt: Date
}
