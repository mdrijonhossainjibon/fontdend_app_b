import { Document } from 'mongoose'

export interface IPricingPlan extends Document {
  code: string
  type: 'count' | 'daily' | 'minute'
  price: number
  priceDisplay: string
  validity: string
  validityDays: number
  recognition: string
  count?: number
  dailyLimit?: number
  rateLimit?: number
  status: 'active' | 'inactive'
  sortOrder: number
  createdAt: Date
  updatedAt: Date
}
