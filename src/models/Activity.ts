import mongoose, { Schema, Document, Model } from 'mongoose'

export interface IActivity extends Document {
    userId: mongoose.Types.ObjectId
    action: string
    type: string
    description: string
    ip: string
    location: string
    status: 'success' | 'failed' | 'warning'
    createdAt: Date
    updatedAt: Date
}

const ActivitySchema: Schema<IActivity> = new Schema(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        action: {
            type: String,
            required: true,
        },
        type: {
            type: String,
            required: true,
        },
        description: {
            type: String,
            required: true,
        },
        ip: {
            type: String,
            required: true,
        },
        location: {
            type: String,
            required: true,
        },
        status: {
            type: String,
            enum: ['success', 'failed', 'warning'],
            default: 'success',
        },
    },
    {
        timestamps: true,
    }
)

export const Activity: Model<IActivity> = mongoose.models.Activity || mongoose.model<IActivity>('Activity', ActivitySchema)

