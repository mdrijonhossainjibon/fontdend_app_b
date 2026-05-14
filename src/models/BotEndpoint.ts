import mongoose, { Document, Schema } from 'mongoose'

export interface IBotEndpoint extends Document {
    botName: string
    endpoint: string  // Can be IP address or URL
    port: number
    protocol: string
    isActive: boolean
    createdAt: Date
    updatedAt: Date
}

const BotEndpointSchema = new Schema<IBotEndpoint>(
    {
        botName: {
            type: String,
            required: [true, 'Bot name is required'],
            trim: true,
            index: true
        },
        endpoint: {
            type: String,
            required: [true, 'Endpoint (IP or URL) is required'],
            trim: true
        },
        port: {
            type: Number,
            required: [true, 'Port is required'],
            min: 1,
            max: 65535,
            default: 80
        },
        protocol: {
            type: String,
            required: [true, 'Protocol is required'],
            enum: ['http', 'https'],
            default: 'http'
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
BotEndpointSchema.index({ endpoint: 1 })
BotEndpointSchema.index({ createdAt: -1 })

// Prevent model recompilation in development
export const BotEndpoint = mongoose.models.BotEndpoint || mongoose.model<IBotEndpoint>('BotEndpoint', BotEndpointSchema)

