import { Document } from 'mongoose'

export interface ICryptoConfig extends Document {
  currency: string
  network: string
  contractAddress?: string
  decimalPlaces: number
  minDeposit: number
  minWithdrawal: number
  withdrawalFee: number
  feeType: 'fixed' | 'percentage'
  depositConfirmations: number
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}
