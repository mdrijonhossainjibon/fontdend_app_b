import { Schema } from 'mongoose'
import { IPackage } from './userPackage.types'

export const UserPackageSchema = new Schema<IPackage>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    packageCode: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ['count', 'daily', 'minute'],
      required: true,
      default: 'count',
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    billingCycle: {
      type: String,
      enum: ['monthly', 'yearly'],
      default: 'monthly',
    },
    credits: {
      type: Number,
      required: true,
      min: 0,
    },
    creditsUsed: {
      type: Number,
      default: 0,
      min: 0,
    },
    creditsRemaining: {
      type: Number,
      default: 0,
      min: 0,
    },
    features: {
      type: [String],
      default: [],
    },
    status: {
      type: String,
      enum: ['active', 'expired', 'cancelled'],
      default: 'active',
    },
    autoRenew: {
      type: Boolean,
      default: true,
    },
    startDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    endDate: {
      type: Date,
      required: true,
    },
    refill: {
      type: Number,
      default: 0,
      min: 0,
    },
    dailyLimitUsed: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
)

// --- Virtuals ---
UserPackageSchema.virtual('usagePercentage').get(function () {
  return this.credits > 0 ? (this.creditsUsed / this.credits) * 100 : 0
})

// --- Indexes ---
UserPackageSchema.index({ userId: 1, status: 1 })
UserPackageSchema.index({ endDate: 1 })
UserPackageSchema.index({ status: 1, endDate: 1 })
