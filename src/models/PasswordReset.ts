import mongoose, { Schema, Document, Model } from 'mongoose'
import crypto from 'crypto'

export interface IPasswordReset extends Document {
    userId: mongoose.Types.ObjectId
    email: string
    token: string
    expiresAt: Date
    used: boolean
    createdAt: Date
}

const PasswordResetSchema: Schema<IPasswordReset> = new Schema({
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    email: {
        type: String,
        required: true,
        lowercase: true,
        trim: true,
    },
    token: {
        type: String,
        required: true,
        unique: true,
    },
    expiresAt: {
        type: Date,
        required: true,
        default: () => new Date(Date.now() + 60 * 60 * 1000), // 1 hour
    },
    used: {
        type: Boolean,
        default: false,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
})

// Index for automatic deletion of expired tokens
PasswordResetSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })
PasswordResetSchema.index({ token: 1 })

// Static method to generate reset token
PasswordResetSchema.statics.generateToken = function (): string {
    return crypto.randomBytes(32).toString('hex')
}

// Prevent model recompilation in development
export const PasswordReset: Model<IPasswordReset> & {
    generateToken(): string
} = (mongoose.models.PasswordReset as any) || mongoose.model<IPasswordReset>('PasswordReset', PasswordResetSchema)

