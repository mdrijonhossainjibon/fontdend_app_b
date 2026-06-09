import { Document, Types } from 'mongoose'

export interface ISolution extends Document {
  userId: Types.ObjectId
  name: string
  description?: string
  code: string
  language: string
  type: 'object_detection' | 'classification' | 'custom' | 'objectTag' | 'objectClassify' | 'objectClick' | 'objectDrag' | 'grid'
  modelId?: string
  version: number
  isActive: boolean
  isPublic: boolean
  config?: Record<string, unknown>
  metrics?: Record<string, number>
  lastDeployedAt?: Date
  hash?: string
  question?: string
  service?: string
  solution?: any
  imageData?: any[]
  examples?: any[]
  classNames?: string[]
  apiKeyId?: string | null
  createdAt: Date
  updatedAt: Date
}
