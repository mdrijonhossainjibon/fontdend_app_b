import { Document } from 'mongoose'

export interface ICreditPackage extends Document {
  name: string
  code: string
  credits: number
  price: number
  discountPrice?: number
  type: 'one_time' | 'subscription'
  billingCycle?: 'monthly' | 'yearly'
  features: string[]
  isActive: boolean
  sortOrder: number
  createdAt: Date
  updatedAt: Date
}
