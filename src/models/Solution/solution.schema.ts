import { Schema } from 'mongoose'
import { ISolution } from './solution.types'

export const SolutionSchema = new Schema<ISolution>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    code: { type: String, required: true },
    language: { type: String, required: true, trim: true },
    type: { type: String, enum: ['object_detection', 'classification', 'custom'], required: true },
    modelId: { type: String, trim: true },
    version: { type: Number, default: 1, min: 1 },
    isActive: { type: Boolean, default: true },
    isPublic: { type: Boolean, default: false },
    config: { type: Schema.Types.Mixed, default: {} },
    metrics: { type: Schema.Types.Mixed, default: {} },
    lastDeployedAt: { type: Date },
  },
  { timestamps: true }
)

SolutionSchema.index({ userId: 1, isActive: 1 })
SolutionSchema.index({ type: 1, isPublic: 1 })
SolutionSchema.index({ name: 'text', description: 'text' })
