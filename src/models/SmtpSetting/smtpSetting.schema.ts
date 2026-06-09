import { Schema } from 'mongoose'
import { ISmtpSetting } from './smtpSetting.types'

export const SmtpSettingSchema = new Schema<ISmtpSetting>(
  {
    host: { type: String, required: true, trim: true },
    port: { type: Number, required: true, min: 1, max: 65535 },
    username: { type: String, required: true, trim: true },
    password: { type: String, required: true },
    fromEmail: { type: String, required: true, lowercase: true, trim: true },
    fromName: { type: String, default: '', trim: true },
    isSecure: { type: Boolean, default: true },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
    rateLimit: { type: Number, default: 10, min: 1 },
    maxConnections: { type: Number, default: 5, min: 1 },
    lastTestedAt: { type: Date },
    lastTestStatus: { type: Boolean },
  },
  { timestamps: true }
)

SmtpSettingSchema.index({ status: 1 })
