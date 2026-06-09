import { Schema } from 'mongoose'
import crypto from 'crypto'
import { IPasswordReset, IPasswordResetModel } from './passwordReset.types'

export const PasswordResetSchema = new Schema<IPasswordReset, IPasswordResetModel>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  token: { type: String, required: true, unique: true },
  expiresAt: { type: Date, required: true },
  used: { type: Boolean, default: false },
  usedAt: { type: Date },
  ip: { type: String, trim: true },
  userAgent: { type: String, trim: true },
  createdAt: { type: Date, default: Date.now },
})
PasswordResetSchema.statics.generateToken = function (): string {
  return crypto.randomBytes(32).toString('hex')
}

PasswordResetSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })
PasswordResetSchema.index({ userId: 1, createdAt: -1 })
