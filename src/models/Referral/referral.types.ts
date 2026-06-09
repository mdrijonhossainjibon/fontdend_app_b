import { Document, Types } from 'mongoose'

export interface IReferral extends Document {
  referrerId: Types.ObjectId
  referredId: Types.ObjectId
  code: string
  status: 'pending' | 'active' | 'rewarded' | 'expired'
  reward?: number
  rewardClaimed: boolean
  claimedAt?: Date
  createdAt: Date
  updatedAt: Date
}
