import { Schema } from 'mongoose'
import { IOtp } from './otp.types'

export const OtpSchema = new Schema<IOtp>({
  email: { type: String, required: true, lowercase: true, trim: true },
  otp: { type: String, required: true },
  expiresAt: { type: Date, required: true, default: () => new Date(Date.now() + 5 * 60 * 1000) },
  verified: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
})
OtpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })
OtpSchema.index({ email: 1, createdAt: -1 })
