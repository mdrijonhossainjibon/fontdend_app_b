import { Schema } from 'mongoose'
import { IBotEndpoint } from './botEndpoint.types'

export const BotEndpointSchema = new Schema<IBotEndpoint>(
  {
    name: { type: String, required: true, unique: true, trim: true },
    url: { type: String, required: true, trim: true },
    method: { type: String, enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'], required: true },
    headers: { type: Schema.Types.Mixed, default: {} },
    body: { type: Schema.Types.Mixed, default: {} },
    timeout: { type: Number, default: 30000, min: 1000 },
    retryCount: { type: Number, default: 3, min: 0 },
    isActive: { type: Boolean, default: true },
    lastTestedAt: { type: Date },
    lastStatus: { type: Number },
  },
  { timestamps: true }
)
BotEndpointSchema.index({ isActive: 1 })
