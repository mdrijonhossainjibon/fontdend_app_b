import { Document, Types } from 'mongoose'

export interface IPromoCode extends Document {
  code: string
  type: 'percentage' | 'fixed'
  discount: number
  maxUses: number
  usedCount: number
  minAmount?: number
  maxDiscount?: number
  expiresAt?: Date
  isActive: boolean
  usedBy: Types.ObjectId[]
  createdAt: Date
  updatedAt: Date
}
