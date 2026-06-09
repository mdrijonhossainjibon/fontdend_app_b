import { Schema } from 'mongoose'
import { IHealthCheck } from './healthCheck.types'

export const HealthCheckSchema = new Schema<IHealthCheck>(
  {
    service: { type: String, required: true, trim: true },
    status: { type: String, enum: ['up', 'down', 'degraded'], required: true },
    responseTime: { type: Number, required: true, min: 0 },
    message: { type: String, trim: true },
    metadata: { type: Schema.Types.Mixed, default: {} },
    checkedAt: { type: Date, default: Date.now },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
)
HealthCheckSchema.index({ service: 1, checkedAt: -1 })
HealthCheckSchema.index({ status: 1 })
