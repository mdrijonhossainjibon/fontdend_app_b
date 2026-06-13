import { Schema } from 'mongoose'
import crypto from 'crypto'
import { IResellerCustomer } from './resellerCustomer.types'

export const ResellerCustomerSchema = new Schema<IResellerCustomer>(
  {
    resellerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    customerEmail: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    key: {
      type: String,
      unique: true,
    },
    prefix: {
      type: String,
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'expired'],
      default: 'active',
    },
    usageCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    lastUsed: Date,
    packageCode: { type: String, required: true },
    packageName: { type: String, required: true },
    packageType: {
      type: String,
      enum: ['count', 'daily', 'minute'],
      required: true,
    },
    price: { type: Number, required: true },
    credits: { type: Number, required: true, min: 0 },
    creditsUsed: { type: Number, default: 0, min: 0 },
    startDate: { type: Date, required: true, default: Date.now },
    endDate: { type: Date, required: true },
  },
  { timestamps: true }
)

ResellerCustomerSchema.index({ resellerId: 1, status: 1 })
ResellerCustomerSchema.index({ key: 1 })
ResellerCustomerSchema.index({ endDate: 1 })

// Generate API key pre-save
ResellerCustomerSchema.pre('save', function (next) {
  if (!this.key || this.isModified('key')) {
    const rand = crypto.randomBytes(24).toString('hex')
    this.key = `rk_live_${rand}`
    this.prefix = 'rk_live_'
  }
  next()
})
