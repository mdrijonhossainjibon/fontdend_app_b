import { Document, Types } from 'mongoose'

export interface IApiKey extends Document {
  userId: Types.ObjectId
  resellerId?: Types.ObjectId
  packageIds?: Types.ObjectId[]
  customerEmail?: string
  name: string
  key: string
  prefix: string
  scopes: string[]
  status: string
  usageCount: number
  lastUsed?: Date
  lastUsedAt?: Date
  expiresAt?: Date
  isActive: boolean
  allowedIps?: string[]
  createdAt: Date
  updatedAt: Date
}
