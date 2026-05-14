import mongoose, { Document, Schema } from 'mongoose'

export interface IEmailTemplate extends Document {
    name: string
    description: string
    subject: string
    content: string
    status: 'active' | 'inactive'
    sent: number
    openRate: number
    lastModifiedAt: Date
    createdAt: Date
    updatedAt: Date
}

const EmailTemplateSchema = new Schema<IEmailTemplate>({
    name: {
        type: String,
        required: true,
        unique: true
    },
    description: {
        type: String,
        required: true
    },
    subject: {
        type: String,
        required: true
    },
    content: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'active'
    },
    sent: {
        type: Number,
        default: 0
    },
    openRate: {
        type: Number,
        default: 0
    },
    lastModifiedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
})

// Create indexes
EmailTemplateSchema.index({ name: 1 })
EmailTemplateSchema.index({ status: 1 })

export const EmailTemplate = mongoose.models.EmailTemplate || mongoose.model<IEmailTemplate>('EmailTemplate', EmailTemplateSchema)
