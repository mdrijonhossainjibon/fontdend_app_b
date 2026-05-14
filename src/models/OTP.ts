import mongoose, { Schema, Document, Model } from 'mongoose'

export interface IOTP extends Document {
    email: string
    otp: string
    expiresAt: Date
    verified: boolean
    createdAt: Date
}

const OTPSchema: Schema<IOTP> = new Schema({
    email: {
        type: String,
        required: true,
        lowercase: true,
        trim: true,
    },
    otp: {
        type: String,
        required: true,
    },
    expiresAt: {
        type: Date,
        required: true,
        default: () => new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
    },
    verified: {
        type: Boolean,
        default: false,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
})

// Index for automatic deletion of expired OTPs
OTPSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

// Prevent model recompilation in development
export const OTP: Model<IOTP> = mongoose.models.OTP || mongoose.model<IOTP>('OTP', OTPSchema)

