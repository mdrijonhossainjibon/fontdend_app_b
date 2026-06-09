import { Document, Types } from 'mongoose'

export interface IUserPackage extends Document {
  userId: Types.ObjectId
  packageCode: string
  type: 'count' | 'daily' | 'minute'
  name: string
  price: number
  billingCycle: 'monthly' | 'yearly'
  credits: number
  creditsUsed: number
  features: string[]
  status: 'active' | 'expired' | 'cancelled'
  autoRenew: boolean
  startDate: Date
  endDate: Date
  createdAt: Date
  updatedAt: Date
}
