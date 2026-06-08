import mongoose, { Document, Schema } from 'mongoose'

export interface IAnalyticsEvent extends Document {
  eventType: 'api_request' | 'captcha_solve' | 'auth' | 'system_error'
  status: 'success' | 'failed' | 'error'
  userId?: mongoose.Types.ObjectId
  apiKeyId?: mongoose.Types.ObjectId
  category?: string
  country?: string
  ip?: string
  responseTime?: number
  metadata?: Record<string, any>
  createdAt: Date
}

const AnalyticsEventSchema: Schema<IAnalyticsEvent> = new Schema(
  {
    eventType: { type: String, enum: ['api_request', 'captcha_solve', 'auth', 'system_error'], required: true, index: true },
    status: { type: String, enum: ['success', 'failed', 'error'], required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    apiKeyId: { type: Schema.Types.ObjectId, ref: 'ApiKey', default: null },
    category: { type: String, default: '', index: true },
    country: { type: String, default: '' },
    ip: { type: String, default: '' },
    responseTime: { type: Number, default: 0 },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
)

AnalyticsEventSchema.index({ createdAt: -1 })
AnalyticsEventSchema.index({ eventType: 1, createdAt: -1 })
AnalyticsEventSchema.index({ eventType: 1, status: 1 })
AnalyticsEventSchema.index({ country: 1 })

export const AnalyticsEvent = mongoose.models.AnalyticsEvent || mongoose.model<IAnalyticsEvent>('AnalyticsEvent', AnalyticsEventSchema)
