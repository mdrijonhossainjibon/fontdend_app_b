import mongoose, { Document, Schema, Model } from 'mongoose'

export interface ITransaction extends Document {
    userId: mongoose.Types.ObjectId
    type: 'purchase' | 'deposit' | 'redeem' | 'usage'
    credits: number
    amount?: number
    label?: string
    meta?: string
    createdAt: Date
    updatedAt: Date
}

const TransactionSchema: Schema<ITransaction> = new Schema(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        type: {
            type: String,
            enum: ['purchase', 'deposit', 'redeem', 'usage'],
            required: true,
        },
        credits: {
            type: Number,
            required: true,
        },
        amount: {
            type: Number,
        },
        label: {
            type: String,
        },
        meta: {
            type: String,
        },
    },
    { timestamps: true }
)

TransactionSchema.index({ userId: 1, createdAt: -1 })

export const Transaction: Model<ITransaction> =
    mongoose.models.Transaction || mongoose.model<ITransaction>('Transaction', TransactionSchema)

