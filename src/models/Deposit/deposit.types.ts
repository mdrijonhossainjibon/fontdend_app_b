import { Document, Types } from 'mongoose'

export interface IDeposit extends Document {
  userId: Types.ObjectId
  cryptoId: string
  cryptoName: string
  networkId: string
  networkName: string
  amount: number
  amountUSD: number
  txHash?: string
  address: string
  status: 'pending' | 'confirming' | 'completed' | 'failed' | 'expired' | 'rejected' | 'approved'
  confirmations: number
  requiredConfirmations: number
  fee?: string
  notes?: string
  expiresAt?: Date
  createdAt: Date
  updatedAt: Date
}
