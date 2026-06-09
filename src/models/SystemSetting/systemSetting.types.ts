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
  platformName?: string
  supportEmail?: string
  maxApiRateLimit?: number
  mainWalletAddress?: string
  twoFARequired?: boolean
  ipWhitelist?: string
  sessionTimeout?: number
  cryptomusMerchantId?: string
  cryptomusApiKey?: string
  cryptomusCreditsPerDollar?: number
  cacheControlAws?: boolean
  cacheControlKbs?: boolean
  cacheControlHcaptcha?: boolean
  cacheControlKblogin?: boolean
  createdAt: Date
  updatedAt: Date
}
