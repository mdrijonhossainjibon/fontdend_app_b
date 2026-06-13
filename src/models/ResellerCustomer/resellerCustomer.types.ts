import { Document, Types } from 'mongoose'

export interface IResellerCustomer extends Document {
  resellerId: Types.ObjectId
  customerEmail: string
  name: string
  key: string
  prefix: string
  status: 'active' | 'inactive' | 'expired'
  usageCount: number
  lastUsed?: Date
  packageCode: string
  packageName: string
  packageType: 'count' | 'daily' | 'minute'
  price: number
  credits: number
  creditsUsed: number
  startDate: Date
  endDate: Date
  createdAt: Date
  updatedAt: Date
}
