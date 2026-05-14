import mongoose, { Document, Schema } from 'mongoose'

export interface IHealthCheck extends Document {
    botName: string
    endpoint: string
    status: 'healthy' | 'unhealthy' | 'unknown'
    responseTime: number
    lastChecked: Date
    uptime: number
    errorMessage?: string
    healthData?: any
    createdAt: Date
    updatedAt: Date
}

const HealthCheckSchema = new Schema<IHealthCheck>(
    {
        botName: {
            type: String,
            required: [true, 'Bot name is required'],
            trim: true,
            index: true
        },
        endpoint: {
            type: String,
            required: [true, 'Endpoint is required'],
            trim: true
        },
        status: {
            type: String,
            required: [true, 'Status is required'],
            enum: ['healthy', 'unhealthy', 'unknown'],
            default: 'unknown',
            index: true
        },
        responseTime: {
            type: Number,
            required: [true, 'Response time is required'],
            default: 0,
            min: 0
        },
        lastChecked: {
            type: Date,
            required: [true, 'Last checked time is required'],
            default: Date.now,
            index: true
        },
        uptime: {
            type: Number,
            required: [true, 'Uptime percentage is required'],
            default: 100,
            min: 0,
            max: 100
        },
        errorMessage: {
            type: String,
            trim: true
        },
        healthData: {
            type: Schema.Types.Mixed,
            default: null
        }
    },
    {
        timestamps: true
    }
)

// Create indexes for efficient querying
HealthCheckSchema.index({ botName: 1 })
HealthCheckSchema.index({ status: 1 })
HealthCheckSchema.index({ lastChecked: -1 })
HealthCheckSchema.index({ createdAt: -1 })

// Prevent model recompilation in development
export const HealthCheck = mongoose.models.HealthCheck || mongoose.model<IHealthCheck>('HealthCheck', HealthCheckSchema)

