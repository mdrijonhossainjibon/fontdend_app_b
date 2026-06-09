import { Document, Types } from 'mongoose'

export interface IUser extends Document {
  name: string
  email: string
  password: string
  role: string
  roles: string[]
  credits: number
  totalCreditsPurchased: number
  status: 'active' | 'inactive' | 'suspended' | 'banned'
  emailVerified: boolean
  referralCode: string
  referredBy?: Types.ObjectId
  twoFactorEnabled: boolean
  twoFactorSecret?: string
  oauthProvider?: string
  oauthId?: string
  avatar?: string
  freeTrialUsed?: boolean
  lastLoginAt?: Date
  lastLoginIp?: string
  metadata?: Record<string, unknown>
  createdAt: Date
  updatedAt: Date
}

export interface IUserMethods {
  comparePassword(candidatePassword: string): Promise<boolean>
  toSafeObject(): Omit<IUser, 'password' | 'twoFactorSecret'>
}
