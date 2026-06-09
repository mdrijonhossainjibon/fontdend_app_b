import { Document, Types } from 'mongoose'

export interface IReferral extends Document {
  referrerId: Types.ObjectId
  referrerUserId: Types.ObjectId
  referredId: Types.ObjectId
  referredUserId: Types.ObjectId
  code: string
  status: 'pending' | 'active' | 'rewarded' | 'expired'
  reward?: number
  rewardClaimed: boolean
  claimedAt?: Date
  commissionEarned?: number
  createdAt: Date
  updatedAt: Date
}
