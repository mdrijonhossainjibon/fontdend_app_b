import mongoose, { Schema, Document } from 'mongoose'

export interface IExtension extends Document {
    name: string
    description: string
    version: string
    platform: string
    changelog: string
    fileName: string
    originalName: string
    fileSize: number
    fileType: string
    downloadUrl: string
    iconUrl?: string
    downloads: number
    isActive: boolean
    createdAt: Date
    updatedAt: Date
}

const ExtensionSchema: Schema = new Schema(
    {
        name: { type: String, required: true },
        description: { type: String, default: '' },
        version: { type: String, required: true },
        platform: { type: String, default: 'All' },
        changelog: { type: String, default: '' },
        fileName: { type: String, required: true },
        originalName: { type: String, required: true },
        fileSize: { type: Number, required: true },
        fileType: { type: String, required: true },
        downloadUrl: { type: String, required: true },
        iconUrl: { type: String, default: '' },
        downloads: { type: Number, default: 0 },
        isActive: { type: Boolean, default: true },
        shortId: { type: String, unique: true },
    },

    { timestamps: true }
)

ExtensionSchema.pre('save', function (next) {
    if (!this.shortId) {
        this.shortId = Math.random().toString(36).substring(2, 8);
    }
    next();
});

export const Extension = mongoose.models.Extension || mongoose.model<IExtension>('Extension', ExtensionSchema)
