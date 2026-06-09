import { Document } from 'mongoose'

export interface ISystemSetting extends Document {
  key: string
  value: string
  type: 'string' | 'number' | 'boolean' | 'json'
  group: string
  description?: string
  isEncrypted: boolean
  freeTrialEnabled?: boolean
  freeTrialCredits?: number
  freeTrialDays?: number
  createdAt: Date
  updatedAt: Date
}
