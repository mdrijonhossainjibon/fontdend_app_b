import { Schema } from 'mongoose'
import { ITransaction } from './transaction.types'

export const TransactionSchema = new Schema<ITransaction>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, enum: ['credit', 'debit', 'purchase', 'redeem', 'deposit'], required: true },
    amount: { type: Number, min: 0 },
    credits: { type: Number },
    balanceBefore: { type: Number, min: 0 },
    balanceAfter: { type: Number, min: 0 },
    currency: { type: String, trim: true },
    description: { type: String, trim: true },
    label: { type: String },
    meta: { type: String },
    referenceType: { type: String, enum: ['deposit', 'withdrawal', 'payment', 'refund', 'credit_purchase', 'usage'] },
    referenceId: { type: String, trim: true },
    status: { type: String, enum: ['pending', 'completed', 'failed', 'cancelled'], default: 'completed' },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
)

TransactionSchema.index({ userId: 1, createdAt: -1 })
TransactionSchema.index({ referenceType: 1, referenceId: 1 })
TransactionSchema.index({ status: 1, createdAt: -1 })
