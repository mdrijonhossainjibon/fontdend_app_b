import { Schema } from 'mongoose'
import { IApiKey } from './apiKey.types'

export const ApiKeySchema = new Schema<IApiKey>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true },
    key: { type: String, required: true, unique: true },
    prefix: { type: String, required: true },
    scopes: { type: [String], default: ['read'] },
    status: { type: String, enum: ['active', 'inactive', 'expired'], default: 'active' },
    usageCount: { type: Number, default: 0 },
    lastUsed: { type: Date },
    lastUsedAt: { type: Date },
    expiresAt: { type: Date },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
)

ApiKeySchema.index({ userId: 1, isActive: 1 })
ApiKeySchema.index({ prefix: 1 })
