import { Schema } from 'mongoose'
import { IUsage } from './usage.types'

export const UsageSchema = new Schema<IUsage>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    creditsUsed: { type: Number, required: true, min: 0 },
    feature: { type: String, required: true, trim: true },
    metadata: { type: Schema.Types.Mixed, default: {} },
    ip: { type: String, trim: true },
  },
  { timestamps: true }
)

UsageSchema.index({ userId: 1, createdAt: -1 })
UsageSchema.index({ feature: 1, createdAt: -1 })
UsageSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 }) // TTL: 90 days
