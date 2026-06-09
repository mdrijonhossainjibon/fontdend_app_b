import { Schema } from 'mongoose'
import { IExtension } from './extension.types'

export const ExtensionSchema = new Schema<IExtension>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true },
    extensionId: { type: String, required: true, unique: true, trim: true },
    type: { type: String, enum: ['chrome', 'firefox', 'edge'], required: true },
    version: { type: String, required: true, trim: true },
    permissions: { type: [String], default: [] },
    isActive: { type: Boolean, default: true },
    lastSeenAt: { type: Date },
    settings: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
)
ExtensionSchema.index({ userId: 1, isActive: 1 })
ExtensionSchema.index({ extensionId: 1 })
