import mongoose, { Schema, Document, Model } from 'mongoose'

// Interface for Network
export interface INetwork {
    id: string
    name: string
}

// Interface for Crypto
export interface ICryptoConfig extends Document {
    id: string
    name: string
    fullName: string
    icon: string
    networks: INetwork[]
    isActive: boolean
    createdAt: Date
    updatedAt: Date
}

// Network Sub-Schema
const NetworkSchema = new Schema<INetwork>({
    id: {
        type: String,
        required: true,
    },
    name: {
        type: String,
        required: true,
    },
}, { _id: false })

// Crypto Config Schema
const CryptoConfigSchema: Schema<ICryptoConfig> = new Schema(
    {
        id: {
            type: String,
            required: true,
            unique: true,
        },
        name: {
            type: String,
            required: true,
        },
        fullName: {
            type: String,
            required: true,
        },
        icon: {
            type: String,
            required: true,
        },
        networks: {
            type: [NetworkSchema],
            required: true,
        },
        isActive: {
            type: Boolean,
            default: true,
        },
    },
    {
        timestamps: true,
    }
)

// Prevent model recompilation in development
export const CryptoConfig: Model<ICryptoConfig> =
    mongoose.models.CryptoConfig || mongoose.model<ICryptoConfig>('CryptoConfig', CryptoConfigSchema)

