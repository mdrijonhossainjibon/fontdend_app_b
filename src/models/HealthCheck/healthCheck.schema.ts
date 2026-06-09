import { Schema } from 'mongoose'
import { IHealthCheck } from './healthCheck.types'

export const HealthCheckSchema = new Schema<IHealthCheck>(
  {
    botName: { type: String, required: true, index: true },
    endpoint: { type: String, required: true },
    status: { type: String, enum: ['up', 'down', 'degraded'], default: 'up', index: true },
    responseTime: { type: Number, default: 0 },
    lastChecked: { type: Date, default: Date.now },
    uptime: { type: Number, default: 100 },
    errorMessage: { type: String },
    healthData: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
)

HealthCheckSchema.index({ botName: 1, lastChecked: -1 })
