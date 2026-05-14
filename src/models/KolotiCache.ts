import mongoose, { Document, Schema } from 'mongoose'

export interface IKolotiCache extends Document {
    imageHash: string      // unique hash of the image
    imageData: string      // base64 image data
    question: string
    answer: number[]
    rawResponse: any       // full API response
    createdAt: Date
}

const KolotiCacheSchema = new Schema<IKolotiCache>({
    imageHash: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    imageData: {
        type: String,
        required: true
    },
    question: {
        type: String,
        required: true
    },
    answer: {
        type: [Number],
        required: true
    },
    rawResponse: {
        type: Schema.Types.Mixed,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
})

// Create indexes
KolotiCacheSchema.index({ createdAt: -1 })
KolotiCacheSchema.index({ imageHash: 1 })

export const KolotiCache = mongoose.models.KolotiCache || mongoose.model<IKolotiCache>('KolotiCache', KolotiCacheSchema)
