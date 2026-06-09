import { Schema } from 'mongoose'
import { IAdminWallet } from './adminWallet.types'

export const AdminWalletSchema = new Schema<IAdminWallet>(
  {
    currency: { type: String, required: true, trim: true },
    network: { type: String, required: true, trim: true },
    address: { type: String, required: true, unique: true, trim: true },
    label: { type: String, trim: true },
    isActive: { type: Boolean, default: true },
    minBalance: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
)

AdminWalletSchema.index({ currency: 1, network: 1 })
AdminWalletSchema.index({ isActive: 1 })
