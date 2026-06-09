import { Document, Types } from 'mongoose'

export interface IUsage extends Document {
  userId: Types.ObjectId
  creditsUsed: number
  feature: string
  metadata?: Record<string, unknown>
  ip?: string
  createdAt: Date
  updatedAt: Date
}
