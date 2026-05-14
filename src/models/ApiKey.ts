import mongoose, { Document, Schema } from 'mongoose'
import crypto from 'crypto'

export interface IApiKey extends Document {
    userId: mongoose.Types.ObjectId
    name: string
    key: string
    status: 'active' | 'inactive' | 'revoked'
    lastUsed: Date | null
    usageCount: number
    createdAt: Date
    updatedAt: Date
}

const ApiKeySchema: Schema<IApiKey> = new Schema(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        name: {
            type: String,
            required: true,
            trim: true,
        },
        key: {
            type: String,
            required: true,
            unique: true,
            index: true,
        },
        status: {
            type: String,
            enum: ['active', 'inactive', 'revoked'],
            default: 'active',
        },
        lastUsed: {
            type: Date,
            default: null,
        },
        usageCount: {
            type: Number,
            default: 0,
        },
    },
    {
        timestamps: true,
    }
)

// Static method to generate API key
ApiKeySchema.statics.generateKey = function (): string {
    const prefix = 'pk_live_'
    const randomPart = crypto.randomBytes(24).toString('hex')
    return `${prefix}${randomPart}`
}

// Index for faster queries
ApiKeySchema.index({ userId: 1, status: 1 })

export const ApiKey = mongoose.models.ApiKey || mongoose.model<IApiKey>('ApiKey', ApiKeySchema)

