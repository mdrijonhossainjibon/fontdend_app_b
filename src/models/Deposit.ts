import mongoose, { Schema, Document, Model } from 'mongoose'

export interface IDeposit extends Document {
    userId: mongoose.Types.ObjectId
    cryptoId: string
    cryptoName: string
    networkId: string
    networkName: string
    amount: number
    amountUSD: number
    txHash?: string
    address: string
    status: 'pending' | 'confirming' | 'completed' | 'failed'
    confirmations: number
    requiredConfirmations: number
    fee: string
    notes?: string
    createdAt: Date
    updatedAt: Date
}

const DepositSchema: Schema<IDeposit> = new Schema(
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
        cryptoName: {
            type: String,
            required: true,
        },
        networkId: {
            type: String,
            required: true,
        },
        networkName: {
            type: String,
            required: true,
        },
        amount: {
            type: Number,
            required: true,
        },
        amountUSD: {
            type: Number,
            required: true,
        },
        txHash: {
            type: String,
            sparse: true,
            index: true,
        },
        address: {
            type: String,
            required: true,
        },
        status: {
            type: String,
            enum: ['pending', 'confirming', 'completed', 'failed'],
            default: 'pending',
            index: true,
        },
        confirmations: {
            type: Number,
            default: 0,
        },
        requiredConfirmations: {
            type: Number,
            required: true,
        },
        fee: {
            type: String,
            required: true,
        },
        notes: {
            type: String,
        },
    },
    {
        timestamps: true,
    }
)

// Compound index for efficient queries
DepositSchema.index({ userId: 1, status: 1, createdAt: -1 })

// Prevent model recompilation in development
export const Deposit: Model<IDeposit> =
    mongoose.models.Deposit || mongoose.model<IDeposit>('Deposit', DepositSchema)

