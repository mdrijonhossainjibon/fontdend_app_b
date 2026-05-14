import mongoose, { Document, Schema } from 'mongoose'

export interface IUsage extends Document {
    userId: mongoose.Types.ObjectId
    date: Date
    totalRequests: number
    successfulRequests: number
    failedRequests: number
    creditsUsed: number
    createdAt: Date
    updatedAt: Date
}

const UsageSchema: Schema<IUsage> = new Schema(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        date: {
            type: Date,
            required: true,
            index: true,
        },
        totalRequests: {
            type: Number,
            default: 0,
            min: 0,
        },
        successfulRequests: {
            type: Number,
            default: 0,
            min: 0,
        },
        failedRequests: {
            type: Number,
            default: 0,
            min: 0,
        },
        creditsUsed: {
            type: Number,
            default: 0,
            min: 0,
        },
    },
    {
        timestamps: true,
    }
)

// Compound index for user and date
UsageSchema.index({ userId: 1, date: 1 }, { unique: true })

export const Usage = mongoose.models.Usage || mongoose.model<IUsage>('Usage', UsageSchema)

