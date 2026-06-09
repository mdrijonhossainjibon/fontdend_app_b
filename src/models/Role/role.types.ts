import { Document } from 'mongoose'

export interface IRole extends Document {
  name: string
  slug: string
  description?: string
  permissions: string[]
  isSystem: boolean
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}
