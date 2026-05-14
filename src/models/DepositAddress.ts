import mongoose, { Schema, Document, Model } from 'mongoose'

export interface IDepositAddress extends Document {
    userId: mongoose.Types.ObjectId
    cryptoId: string
    networkId: string
    address: string
    privateKey: string
    isActive: boolean
    lastUsedAt?: Date
    lastBalance: number
    lastTxHash?: string
    createdAt: Date
    updatedAt: Date
}

const DepositAddressSchema: Schema<IDepositAddress> = new Schema(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        cryptoId: {
            type: String,
            required: true,
        },
        networkId: {
            type: String,
            required: true,
        },
        address: {
            type: String,
            required: true,
            // Removed global unique constraint to allow reuse for same user across different cryptos/networks
        },
        privateKey: {
            type: String,
            required: true,
        },
        isActive: {
            type: Boolean,
            default: true,
        },
        lastUsedAt: {
            type: Date,
        },
        lastBalance: {
            type: Number,
            default: 0,
        },
        lastTxHash: {
            type: String,
        },
    },
    {
        timestamps: true,
    }
)

// Compound index for user-specific crypto/network lookups
DepositAddressSchema.index({ userId: 1, cryptoId: 1, networkId: 1 }, { unique: true })

// Prevent model recompilation in development
export const DepositAddress: Model<IDepositAddress> =
    mongoose.models.DepositAddress || mongoose.model<IDepositAddress>('DepositAddress', DepositAddressSchema)

