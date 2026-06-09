import { Document, Types } from 'mongoose'

export interface IDepositAddress extends Document {
  userId: Types.ObjectId
  currency: string
  network: string
  address: string
  label?: string
  isActive: boolean
  totalDeposited: number
  lastDepositedAt?: Date
  cryptoId?: string
  networkId?: string
  privateKey?: string
  createdAt: Date
  updatedAt: Date
}
