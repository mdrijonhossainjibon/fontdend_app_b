import { Document } from 'mongoose'

export interface IBotEndpoint extends Document {
  name: string
  url: string
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  headers?: Record<string, string>
  body?: Record<string, unknown>
  timeout: number
  retryCount: number
  isActive: boolean
  lastTestedAt?: Date
  lastStatus?: number
  createdAt: Date
  updatedAt: Date
}
