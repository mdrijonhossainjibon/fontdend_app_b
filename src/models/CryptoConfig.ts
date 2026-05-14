import mongoose, { Schema, Document, Model } from 'mongoose'

// Interface for Network
export interface INetwork {
    id: string
    name: string
    fee: string
    time: string
    confirmations: number
    minDeposit: string
    address: string
    rpcUrl?: string
    tokenAddress?: string // For ERC20/BEP20 tokens
    chainId?: number // To facilitate network switching
    badge?: string
    badgeColor?: string
    isActive: boolean
}

// Interface for Crypto
export interface ICryptoConfig extends Document {
    id: string
    name: string
    fullName: string
    icon: string
    color: string
    bg: string
    borderGlow: string
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
    fee: {
        type: String,
        required: true,
    },
    time: {
        type: String,
        required: true,
    },
    confirmations: {
        type: Number,
        required: true,
    },
    minDeposit: {
        type: String,
        required: true,
    },
    address: {
        type: String,
        required: true,
    },
    rpcUrl: {
        type: String,
    },
    tokenAddress: {
        type: String, // Optional, only for tokens
    },
    chainId: {
        type: Number, // Facilitates wallet network switching
    },
    badge: {
        type: String,
    },
    badgeColor: {
        type: String,
    },
    isActive: {
        type: Boolean,
        default: true,
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
        color: {
            type: String,
            required: true,
        },
        bg: {
            type: String,
            required: true,
        },
        borderGlow: {
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

