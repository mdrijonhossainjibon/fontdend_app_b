import { Document, Types } from 'mongoose'

export interface IResellerApiKey extends Document {
  resellerId: Types.ObjectId
  name: string
  key: string
  prefix: string
  status: 'active' | 'inactive' | 'expired'
  usageCount: number
  lastUsed?: Date
  lastUsedAt?: Date
  customerEmail?: string
  isActive: boolean
  expiresAt?: Date
  allowedIps: string[]
  createdAt: Date
  updatedAt: Date
}
