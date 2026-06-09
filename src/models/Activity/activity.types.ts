import { Document, Types } from 'mongoose'

export interface IActivity extends Document {
  userId: Types.ObjectId
  action: string
  resource: string
  resourceId?: string
  metadata?: Record<string, unknown>
  ip?: string
  userAgent?: string
  createdAt: Date
  updatedAt: Date
}
