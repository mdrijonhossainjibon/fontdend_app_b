import { Document, Types } from 'mongoose'

export interface IAdminWallet extends Document {
  currency: string
  network: string
  address: string
  label?: string
  isActive: boolean
  minBalance: number
  createdAt: Date
  updatedAt: Date
}
