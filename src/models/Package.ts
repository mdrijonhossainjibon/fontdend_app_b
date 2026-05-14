import mongoose, { Document, Schema } from 'mongoose'

export interface IPackage extends Document {
    userId: mongoose.Types.ObjectId
    packageCode: string
    type: 'count' | 'daily' | 'minute'
    name: string
    price: number
    billingCycle: 'monthly' | 'yearly'
    credits: number
    creditsUsed: number
    features: string[]
    status: 'active' | 'expired' | 'cancelled'
    autoRenew: boolean
    startDate: Date
    endDate: Date
    createdAt: Date
    updatedAt: Date
}

const PackageSchema: Schema<IPackage> = new Schema(
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
    },
    {
        timestamps: true,
    }
)

// Virtual for credits remaining
PackageSchema.virtual('creditsRemaining').get(function () {
    return this.credits - this.creditsUsed
})

// Virtual for usage percentage
PackageSchema.virtual('usagePercentage').get(function () {
    return this.credits > 0 ? (this.creditsUsed / this.credits) * 100 : 0
})

// Index for faster queries
PackageSchema.index({ userId: 1, status: 1 })
PackageSchema.index({ endDate: 1 })

export const Package = mongoose.models.Package || mongoose.model<IPackage>('Package', PackageSchema)

