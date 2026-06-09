import mongoose, { Document } from 'mongoose'

export interface IPackage extends Document {
  userId: mongoose.Types.ObjectId
  packageCode: string
  type: 'count' | 'daily' | 'minute'
  name: string
  price: number
  billingCycle: 'monthly' | 'yearly'
  credits: number
  creditsUsed: number
  creditsRemaining: number
  features: string[]
  status: 'active' | 'expired' | 'cancelled'
  autoRenew: boolean
  startDate: Date
  endDate: Date
  createdAt: Date
  updatedAt: Date
  refill?: number
  dailyLimitUsed?: number
}
