import { Schema } from 'mongoose'
import { IEmailTemplate } from './emailTemplate.types'

export const EmailTemplateSchema = new Schema<IEmailTemplate>(
  {
    name: { type: String, required: true, unique: true, trim: true },
    subject: { type: String, required: true, trim: true },
    body: { type: String, required: true },
    variables: { type: [String], default: [] },
    type: { type: String, enum: ['verify_email', 'password_reset', 'welcome', 'deposit', 'withdrawal', 'notification'], required: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
)
EmailTemplateSchema.index({ type: 1, isActive: 1 })
