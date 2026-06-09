import { Schema } from 'mongoose'
import { ICryptoConfig } from './cryptoConfig.types'

export const CryptoConfigSchema = new Schema<ICryptoConfig>(
  {
    id: { type: String, required: true, unique: true, trim: true },
    name: { type: String, required: true, trim: true },
    fullName: { type: String, required: true, trim: true },
    icon: { type: String },
    networks: [{
      id: { type: String, required: true },
      name: { type: String, required: true },
      contractAddress: { type: String },
      decimalPlaces: { type: Number, default: 18 },
      minDeposit: { type: Number, default: 0 },
      fee: { type: Number, default: 0 },
      confirmations: { type: Number, default: 12 },
      isActive: { type: Boolean, default: true },
    }],
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
)
CryptoConfigSchema.index({ id: 1 })
CryptoConfigSchema.index({ isActive: 1 })
