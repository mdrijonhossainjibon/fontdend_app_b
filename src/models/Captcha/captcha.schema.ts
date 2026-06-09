import { Schema } from 'mongoose'
import { ICaptcha } from './captcha.types'

export const CaptchaSchema = new Schema<ICaptcha>(
  {
    siteKey: { type: String, required: true, trim: true },
    secretKey: { type: String, required: true },
    provider: { type: String, enum: ['recaptcha', 'hcaptcha', 'cloudflare'], required: true },
    isActive: { type: Boolean, default: true },
    scoreThreshold: { type: Number, default: 0.5, min: 0, max: 1 },
  },
  { timestamps: true }
)
CaptchaSchema.index({ provider: 1, isActive: 1 })
