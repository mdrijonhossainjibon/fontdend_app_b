import { Document, Types } from 'mongoose'

export interface ISolution extends Document {
  userId: Types.ObjectId
  name: string
  description?: string
  code: string
  language: string
  type: 'object_detection' | 'classification' | 'custom'
  modelId?: string
  version: number
  isActive: boolean
  isPublic: boolean
  config?: Record<string, unknown>
  metrics?: Record<string, number>
  lastDeployedAt?: Date
  createdAt: Date
  updatedAt: Date
}
