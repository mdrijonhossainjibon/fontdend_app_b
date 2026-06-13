import { Schema } from 'mongoose'
import { IResellerApiKey } from './resellerApiKey.types'

const generateKey = (): string => {
  return 'rk_live_' + require('crypto').randomBytes(32).toString('hex')
}

export const ResellerApiKeySchema = new Schema<IResellerApiKey>(
  {
    resellerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true },
    key: { type: String, required: true, unique: true, default: generateKey },
    prefix: { type: String, default: 'rk' },
    status: { type: String, enum: ['active', 'inactive', 'expired'], default: 'active' },
    usageCount: { type: Number, default: 0 },
    lastUsed: { type: Date },
    lastUsedAt: { type: Date },
    customerEmail: { type: String, trim: true },
    isActive: { type: Boolean, default: true },
    expiresAt: { type: Date },
    allowedIps: [{ type: String }],
  },
  { timestamps: true }
)

ResellerApiKeySchema.index({ resellerId: 1, status: 1 })
ResellerApiKeySchema.index({ prefix: 1 })
