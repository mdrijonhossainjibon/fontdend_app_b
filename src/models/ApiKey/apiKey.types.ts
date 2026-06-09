import { Document, Types } from 'mongoose'

export interface IApiKey extends Document {
  userId: Types.ObjectId
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
  createdAt: Date
  updatedAt: Date
}
