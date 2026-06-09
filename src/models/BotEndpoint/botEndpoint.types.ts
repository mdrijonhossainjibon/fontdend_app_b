import { Document } from 'mongoose'

export interface IBotEndpoint extends Document {
  botName: string
  endpoint: string
  port: number
  protocol: 'http' | 'https'
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}
