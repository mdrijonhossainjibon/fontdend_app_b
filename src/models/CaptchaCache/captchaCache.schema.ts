import { Schema } from 'mongoose'
import { ICaptchaCache } from './captchaCache.types'

export const CaptchaCacheSchema = new Schema<ICaptchaCache>({
  imageHash: { type: String, required: true, unique: true },
  imageData: { type: String, required: true },
  question: { type: String, required: true },
  answer: { type: [Number], required: true },
  rawResponse: { type: Schema.Types.Mixed, required: true },
  createdAt: { type: Date, default: Date.now },
})
CaptchaCacheSchema.index({ createdAt: -1 })
