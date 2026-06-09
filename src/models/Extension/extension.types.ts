import { Document, Types } from 'mongoose'

export interface IExtension extends Document {
  userId: Types.ObjectId
  name: string
  extensionId: string
  type: 'chrome' | 'firefox' | 'edge'
  version: string
  permissions: string[]
  isActive: boolean
  lastSeenAt?: Date
  settings?: Record<string, unknown>
  createdAt: Date
  updatedAt: Date
}
