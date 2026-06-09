import { Document } from 'mongoose'

export interface IBotConfig extends Document {
  key: string
  value: string
  description?: string
  isEncrypted: boolean
  createdAt: Date
  updatedAt: Date
}
