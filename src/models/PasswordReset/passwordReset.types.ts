import { Document, Types, Model } from 'mongoose'

export interface IPasswordReset extends Document {
  userId: Types.ObjectId
  token: string
  expiresAt: Date
  used: boolean
  usedAt?: Date
  ip?: string
  userAgent?: string
  createdAt: Date
}

export interface IPasswordResetModel extends Model<IPasswordReset> {
  generateToken(): string
}
