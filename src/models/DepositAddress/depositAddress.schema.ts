import { Schema } from 'mongoose'
import { IDepositAddress } from './depositAddress.types'

export const DepositAddressSchema = new Schema<IDepositAddress>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    currency: { type: String, required: true, trim: true },
    network: { type: String, required: true, trim: true },
    address: { type: String, required: true, unique: true, trim: true },
    label: { type: String, trim: true },
    isActive: { type: Boolean, default: true },
    totalDeposited: { type: Number, default: 0, min: 0 },
    lastDepositedAt: { type: Date },
    cryptoId: { type: String },
    networkId: { type: String },
    privateKey: { type: String },
  },
  { timestamps: true }
)
DepositAddressSchema.index({ userId: 1, currency: 1 })
DepositAddressSchema.index({ address: 1 })
