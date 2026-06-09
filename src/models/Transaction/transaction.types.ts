import { Document, Types } from 'mongoose'

export interface ITransaction extends Document {
  userId: Types.ObjectId
  type: 'credit' | 'debit'
  amount: number
  balanceBefore: number
  balanceAfter: number
  currency: string
  description: string
  referenceType: 'deposit' | 'withdrawal' | 'payment' | 'refund' | 'credit_purchase' | 'usage'
  referenceId?: string
  status: 'pending' | 'completed' | 'failed' | 'cancelled'
  metadata?: Record<string, unknown>
  createdAt: Date
  updatedAt: Date
}
