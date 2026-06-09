import { Document, Types } from 'mongoose'

export interface IExtension extends Document {
  userId: Types.ObjectId
  name: string
  version: string
  description?: string
  platform?: string
  downloadUrl?: string
  downloads?: number
  fileName?: string
  originalName?: string
  fileSize?: number
  fileType?: string
  iconUrl?: string
  shortId?: string
  changelog?: string
  extensionId: string
  permissions: string[]
  lastSeenAt?: Date
  settings: Record<string, unknown>
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}
