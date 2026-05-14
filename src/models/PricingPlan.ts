import mongoose, { Document, Schema } from 'mongoose'

export interface IPricingPlan extends Document {
    code: string
    type: 'count' | 'daily' | 'minute'
    price: number
    priceDisplay: string
    validity: string
    validityDays: number
    recognition: string
    // Type-specific fields
    count?: number        // For count type
    dailyLimit?: number   // For daily type
    rateLimit?: number    // For minute type
    // Metadata
    isActive: boolean
    isPromo: boolean
    sortOrder: number
    createdAt: Date
    updatedAt: Date
}

const PricingPlanSchema: Schema<IPricingPlan> = new Schema(
    {
        code: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            uppercase: true,
        },
        type: {
            type: String,
            enum: ['count', 'daily', 'minute'],
            required: true,
            index: true,
        },
        price: {
            type: Number,
            required: true,
            min: 0,
        },
        priceDisplay: {
            type: String,
            required: true,
        },
        validity: {
            type: String,
            required: true,
            default: '30d',
        },
        validityDays: {
            type: Number,
            required: true,
            default: 30,
        },
        recognition: {
            type: String,
            required: true,
            default: 'Image',
        },
        // Type-specific fields
        count: {
            type: Number,
            min: 0,
        },
        dailyLimit: {
            type: Number,
            min: 0,
        },
        rateLimit: {
            type: Number,
            min: 0,
        },
        // Metadata
        isActive: {
            type: Boolean,
            default: true,
        },
        isPromo: {
            type: Boolean,
            default: false,
        },
        sortOrder: {
            type: Number,
            default: 0,
        },
    },
    {
        timestamps: true,
    }
)

// Indexes for better query performance
PricingPlanSchema.index({ type: 1, isActive: 1 })
PricingPlanSchema.index({ sortOrder: 1 })

// Virtual for formatted limit value
PricingPlanSchema.virtual('limitValue').get(function () {
    switch (this.type) {
        case 'count':
            return this.count
        case 'daily':
            return this.dailyLimit
        case 'minute':
            return this.rateLimit
        default:
            return 0
    }
})

export const PricingPlan = mongoose.models.PricingPlan || mongoose.model<IPricingPlan>('PricingPlan', PricingPlanSchema)

