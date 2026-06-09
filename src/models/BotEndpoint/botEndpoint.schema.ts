import { Schema } from 'mongoose'
import { IBotEndpoint } from './botEndpoint.types'

export const BotEndpointSchema = new Schema<IBotEndpoint>(
  {
    botName: { type: String, required: true, trim: true, index: true },
    endpoint: { type: String, required: true, trim: true },
    port: { type: Number, required: true, min: 1, max: 65535, default: 80 },
    protocol: { type: String, required: true, enum: ['http', 'https'], default: 'http' },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
)
BotEndpointSchema.index({ endpoint: 1 })
BotEndpointSchema.index({ createdAt: -1 })
