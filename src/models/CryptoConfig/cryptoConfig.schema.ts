import { Schema } from 'mongoose'
import { ICryptoConfig } from './cryptoConfig.types'

export const CryptoConfigSchema = new Schema<ICryptoConfig>(
  {
    currency: { type: String, required: true, trim: true },
    network: { type: String, required: true, trim: true },
    contractAddress: { type: String, trim: true },
    decimalPlaces: { type: Number, default: 18, min: 0 },
    minDeposit: { type: Number, default: 0, min: 0 },
    minWithdrawal: { type: Number, default: 0, min: 0 },
    withdrawalFee: { type: Number, default: 0, min: 0 },
    feeType: { type: String, enum: ['fixed', 'percentage'], default: 'fixed' },
    depositConfirmations: { type: Number, default: 12, min: 1 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
)
CryptoConfigSchema.index({ currency: 1, network: 1 }, { unique: true })
CryptoConfigSchema.index({ isActive: 1 })
