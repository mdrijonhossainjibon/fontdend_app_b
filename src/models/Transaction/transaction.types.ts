import { Document, Types } from 'mongoose'

export interface ITransaction extends Document {
  userId: Types.ObjectId
  type: 'credit' | 'debit' | 'purchase' | 'redeem' | 'deposit'
  amount: number
  credits?: number
  balanceBefore: number
  balanceAfter: number
  currency: string
  description: string
  label?: string
  meta?: string
  referenceType: 'deposit' | 'withdrawal' | 'payment' | 'refund' | 'credit_purchase' | 'usage'
  referenceId?: string
  status: 'pending' | 'completed' | 'failed' | 'cancelled'
  metadata?: Record<string, unknown>
  createdAt: Date
  updatedAt: Date
}
