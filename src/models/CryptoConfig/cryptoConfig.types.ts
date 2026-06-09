import { Document } from 'mongoose'

export interface ICryptoConfig extends Document {
  id: string
  name: string
  fullName: string
  icon?: string
  networks: {
    id: string
    name: string
    contractAddress?: string
    decimalPlaces?: number
    minDeposit?: number
    fee?: number
    confirmations?: number
    isActive: boolean
  }[]
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}
