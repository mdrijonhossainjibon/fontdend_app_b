import mongoose, { Schema, Document, Model } from 'mongoose'

export interface IAdminWallet extends Document {
    address: string;
    network: string; // e.g., 'ethereum', 'bsc', 'tron'
    label: string;   // e.g., 'Main Payout Wallet'
    symbol: string;  // e.g., 'USDT', 'ETH', 'BNB'
    balance: string; // We can store the last known balance
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const AdminWalletSchema: Schema<IAdminWallet> = new Schema(
    {
        address: {
            type: String,
            required: true,
            unique: true,
            trim: true,
        },
        network: {
            type: String,
            required: true,
        },
        label: {
            type: String,
            required: true,
        },
        symbol: {
            type: String,
            required: true,
        },
        balance: {
            type: String,
            default: '0.00',
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

export const AdminWallet: Model<IAdminWallet> =
    mongoose.models.AdminWallet || mongoose.model<IAdminWallet>('AdminWallet', AdminWalletSchema)

