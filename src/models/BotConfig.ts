import mongoose, { Document, Schema } from 'mongoose'

export interface IBotConfig extends Document {
    botName: string
    description: string
    isActive: boolean
    createdAt: Date
    updatedAt: Date
}

const BotConfigSchema = new Schema<IBotConfig>(
    {
        botName: {
            type: String,
            required: [true, 'Bot name is required'],
            trim: true,
            index: true
        },
        description: {
            type: String,
            required: [true, 'Description is required'],
            trim: true
        },
        isActive: {
            type: Boolean,
            default: true,
            index: true
        }
    },
    {
        timestamps: true
    }
)

// Create indexes for efficient querying
BotConfigSchema.index({ botName: 1 })
BotConfigSchema.index({ isActive: 1 })
BotConfigSchema.index({ createdAt: -1 })

// Prevent model recompilation in development
export const BotConfig = mongoose.models.BotConfig || mongoose.model<IBotConfig>('BotConfig', BotConfigSchema)

