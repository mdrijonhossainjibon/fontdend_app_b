import { Schema } from 'mongoose'
import { ISystemSetting } from './systemSetting.types'

export const SystemSettingSchema = new Schema<ISystemSetting>(
  {
    key: { type: String, required: true, unique: true, trim: true },
    value: { type: String, required: true },
    type: { type: String, enum: ['string', 'number', 'boolean', 'json'], default: 'string' },
    group: { type: String, default: 'general', trim: true },
    description: { type: String, default: '' },
    isEncrypted: { type: Boolean, default: false },
    freeTrialEnabled: { type: Boolean, default: false },
    freeTrialCredits: { type: Number, default: 250 },
    freeTrialDays: { type: Number, default: 7 },
    platformName: { type: String },
    supportEmail: { type: String },
    maxApiRateLimit: { type: Number },
    mainWalletAddress: { type: String },
    twoFARequired: { type: Boolean },
    ipWhitelist: { type: String },
    sessionTimeout: { type: Number },
    cryptomusMerchantId: { type: String },
    cryptomusApiKey: { type: String },
    cryptomusCreditsPerDollar: { type: Number },
    cacheControlAws: { type: Boolean, default: true },
    cacheControlKbs: { type: Boolean, default: true },
    cacheControlHcaptcha: { type: Boolean, default: true },
    cacheControlKblogin: { type: Boolean, default: true },
  },
  { timestamps: true }
)

SystemSettingSchema.index({ group: 1 })
SystemSettingSchema.index({ key: 1 })
