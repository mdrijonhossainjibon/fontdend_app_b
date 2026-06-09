import { Document, Types } from 'mongoose'

export interface IAnalyticsEvent extends Document {
  event: string
  category: string
  label?: string
  value?: number
  userId?: Types.ObjectId
  metadata?: Record<string, unknown>
  ip?: string
  userAgent?: string
  createdAt: Date
  updatedAt: Date
}
