import { Schema } from 'mongoose'
import { IDeposit } from './deposit.types'

export const DepositSchema = new Schema<IDeposit>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    cryptoId: { type: String, required: true },
    cryptoName: { type: String, required: true },
    networkId: { type: String, required: true },
    networkName: { type: String, required: true },
    amount: { type: Number, required: true },
    amountUSD: { type: Number, required: true },
    txHash: { type: String, sparse: true, index: true },
    address: { type: String, required: true },
    status: { type: String, enum: ['pending', 'confirming', 'completed', 'failed', 'expired', 'rejected', 'approved'], default: 'pending', index: true },
    confirmations: { type: Number, default: 0 },
    requiredConfirmations: { type: Number, default: 12 },
    fee: { type: String },
    notes: { type: String },
    expiresAt: { type: Date },
  },
  { timestamps: true }
)
DepositSchema.index({ userId: 1, status: 1 })
DepositSchema.index({ status: 1, createdAt: -1 })
