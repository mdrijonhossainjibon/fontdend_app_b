import { Schema } from 'mongoose'
import { IDeposit } from './deposit.types'

export const DepositSchema = new Schema<IDeposit>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    txId: { type: String, required: true, unique: true, trim: true },
    currency: { type: String, required: true, trim: true },
    network: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0 },
    fee: { type: Number, default: 0, min: 0 },
    netAmount: { type: Number, required: true, min: 0 },
    address: { type: String, required: true, trim: true },
    fromAddress: { type: String, trim: true },
    confirmations: { type: Number, default: 0, min: 0 },
    requiredConfirmations: { type: Number, default: 12, min: 1 },
    status: { type: String, enum: ['pending', 'confirming', 'completed', 'failed'], default: 'pending' },
    metadata: { type: Schema.Types.Mixed, default: {} },
    completedAt: { type: Date },
  },
  { timestamps: true }
)
DepositSchema.index({ userId: 1, status: 1 })
DepositSchema.index({ status: 1, createdAt: -1 })
DepositSchema.index({ txId: 1 })
