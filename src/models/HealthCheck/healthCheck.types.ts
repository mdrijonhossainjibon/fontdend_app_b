import { Document } from 'mongoose'

export interface IHealthCheck extends Document {
  service: string
  status: 'up' | 'down' | 'degraded'
  responseTime: number
  message?: string
  metadata?: Record<string, unknown>
  checkedAt: Date
  createdAt: Date
}
