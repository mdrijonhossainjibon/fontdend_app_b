import { Schema } from 'mongoose'
import { IReferral } from './referral.types'

export const ReferralSchema = new Schema<IReferral>(
  {
    referrerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    referrerUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    referredId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    referredUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    code: { type: String, required: true, trim: true },
    status: { type: String, enum: ['pending', 'active', 'rewarded', 'expired'], default: 'pending' },
    reward: { type: Number, min: 0 },
    rewardClaimed: { type: Boolean, default: false },
    claimedAt: { type: Date },
    commissionEarned: { type: Number, default: 0 },
  },
  { timestamps: true }
)

ReferralSchema.index({ referrerId: 1, status: 1 })
ReferralSchema.index({ referrerUserId: 1, status: 1 })
ReferralSchema.index({ code: 1 })
