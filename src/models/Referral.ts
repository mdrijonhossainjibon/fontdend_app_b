import mongoose, { Document, Schema, Model } from 'mongoose'

export interface IReferral extends Document {
    referrerUserId: mongoose.Types.ObjectId
    referredUserId: mongoose.Types.ObjectId
    status: 'active' | 'inactive'
    commissionEarned: number
    createdAt: Date
    updatedAt: Date
}

const ReferralSchema: Schema<IReferral> = new Schema(
    {
        referrerUserId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        referredUserId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            unique: true,
        },
        status: {
            type: String,
            enum: ['active', 'inactive'],
            default: 'active',
        },
        commissionEarned: {
            type: Number,
            default: 0,
        },
    },
    { timestamps: true }
)

ReferralSchema.index({ referrerUserId: 1, createdAt: -1 })

export const Referral: Model<IReferral> =
    mongoose.models.Referral || mongoose.model<IReferral>('Referral', ReferralSchema)
