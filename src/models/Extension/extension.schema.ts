import { Schema } from 'mongoose'
import { IExtension } from './extension.types'

export const ExtensionSchema = new Schema<IExtension>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true },
    version: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    platform: { type: String, default: 'chrome' },
    downloadUrl: { type: String, default: '' },
    downloads: { type: Number, default: 0 },
    fileName: { type: String, default: '' },
    originalName: { type: String, default: '' },
    fileSize: { type: Number, default: 0 },
    fileType: { type: String, default: '' },
    iconUrl: { type: String, default: '' },
    shortId: { type: String, unique: true, sparse: true },
    changelog: { type: String, default: '' },
    extensionId: { type: String, required: true },
    permissions: { type: [String], default: [] },
    lastSeenAt: { type: Date },
    settings: { type: Schema.Types.Mixed, default: {} },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
)

ExtensionSchema.index({ userId: 1, isActive: 1 })
ExtensionSchema.index({ extensionId: 1 })
ExtensionSchema.index({ shortId: 1 })
