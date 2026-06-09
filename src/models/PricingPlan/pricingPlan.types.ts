import { Document } from 'mongoose'

export interface IPricingPlan extends Document {
  name: string
  code: string
  description: string
  price: number
  credits: number
  type: 'free' | 'basic' | 'premium' | 'enterprise'
  billingCycle: 'monthly' | 'yearly' | 'one_time'
  features: string[]
  limits: Record<string, number>
  isActive: boolean
  sortOrder: number
  popular: boolean
  createdAt: Date
  updatedAt: Date
}
