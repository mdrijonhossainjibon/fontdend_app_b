import { Schema } from 'mongoose'
import { ITransaction } from './transaction.types'

export const TransactionSchema = new Schema<ITransaction>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, enum: ['credit', 'debit'], required: true },
    amount: { type: Number, required: true, min: 0 },
    balanceBefore: { type: Number, required: true, min: 0 },
    balanceAfter: { type: Number, required: true, min: 0 },
    currency: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    referenceType: { type: String, enum: ['deposit', 'withdrawal', 'payment', 'refund', 'credit_purchase', 'usage'], required: true },
    referenceId: { type: String, trim: true },
    status: { type: String, enum: ['pending', 'completed', 'failed', 'cancelled'], default: 'completed' },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
)

TransactionSchema.index({ userId: 1, createdAt: -1 })
TransactionSchema.index({ referenceType: 1, referenceId: 1 })
TransactionSchema.index({ status: 1, createdAt: -1 })
