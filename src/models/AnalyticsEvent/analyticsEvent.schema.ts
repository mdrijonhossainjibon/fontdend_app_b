import { Schema } from 'mongoose'
import { IAnalyticsEvent } from './analyticsEvent.types'

export const AnalyticsEventSchema = new Schema<IAnalyticsEvent>(
  {
    event: { type: String, required: true, trim: true },
    category: { type: String, required: true, trim: true },
    label: { type: String, trim: true },
    value: { type: Number },
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    metadata: { type: Schema.Types.Mixed, default: {} },
    ip: { type: String, trim: true },
    userAgent: { type: String, trim: true },
  },
  { timestamps: true }
)

AnalyticsEventSchema.index({ event: 1, createdAt: -1 })
AnalyticsEventSchema.index({ category: 1, createdAt: -1 })
AnalyticsEventSchema.index({ userId: 1, createdAt: -1 })
