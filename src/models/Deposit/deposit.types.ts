import { Document, Types } from 'mongoose'

export interface IDeposit extends Document {
  userId: Types.ObjectId
  txId: string
  currency: string
  network: string
  amount: number
  fee: number
  netAmount: number
  address: string
  fromAddress?: string
  confirmations: number
  requiredConfirmations: number
  status: 'pending' | 'confirming' | 'completed' | 'failed'
  metadata?: Record<string, unknown>
  completedAt?: Date
  createdAt: Date
  updatedAt: Date
}
