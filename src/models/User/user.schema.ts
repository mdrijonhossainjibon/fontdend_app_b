import { Schema } from 'mongoose'
import bcrypt from 'bcryptjs'
import { IUser, IUserMethods } from './user.types'

const SALT_ROUNDS = 12

export const UserSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 100,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: /^\S+@\S+\.\S+$/,
    },
    password: {
      type: String,
      required: true,
      minlength: 8,
      select: false,
    },
    role: {
      type: String,
      enum: ['user', 'solver', 'admin', 'superadmin'],
      default: 'user',
      index: true,
    },
    roles: {
      type: [String],
      default: ['user'],
    },
    credits: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalCreditsPurchased: {
      type: Number,
      default: 0,
      min: 0,
    },
    balance: {
      type: Number,
      default: 0,
    },
    referralEarnings: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'suspended', 'banned'],
      default: 'active',
    },
    emailVerified: {
      type: Boolean,
      default: false,
    },
    referralCode: {
      type: String,
      unique: true,
      trim: true,
    },
    referredBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    twoFactorEnabled: {
      type: Boolean,
      default: false,
    },
    twoFactorSecret: {
      type: String,
      select: false,
    },
    oauthProvider: {
      type: String,
      enum: ['google', 'github', ''],
    },
    oauthId: {
      type: String,
    },
    avatar: {
      type: String,
    },
    freeTrialUsed: {
      type: Boolean,
      default: false,
    },
    lastLoginAt: {
      type: Date,
    },
    lastLoginIp: {
      type: String,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
)

UserSchema.index({ email: 1 })
UserSchema.index({ referralCode: 1 })
UserSchema.index({ status: 1, role: 1 })
UserSchema.index({ createdAt: -1 })

UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next()
  try {
    const salt = await bcrypt.genSalt(SALT_ROUNDS)
    this.password = await bcrypt.hash(this.password, salt)
    next()
  } catch (err: any) {
    next(err)
  }
})

UserSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password)
}

UserSchema.methods.toSafeObject = function (): Omit<IUser, 'password' | 'twoFactorSecret'> {
  const obj = this.toObject()
  delete obj.password
  delete obj.twoFactorSecret
  return obj
}
