import { Document } from 'mongoose'

export interface IHealthCheck extends Document {
  botName: string
  endpoint: string
  status: 'up' | 'down' | 'degraded'
  responseTime: number
  lastChecked: Date
  uptime?: number
  errorMessage?: string
  healthData?: any
  createdAt: Date
  updatedAt: Date
}
