import { Schema } from 'mongoose'
import { IActivity } from './activity.types'

export const ActivitySchema = new Schema<IActivity>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    action: {
      type: String,
      required: true,
      trim: true,
    },
    resource: {
      type: String,
      required: true,
      trim: true,
    },
    resourceId: {
      type: String,
      trim: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
    ip: {
      type: String,
      trim: true,
    },
    userAgent: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
)

ActivitySchema.index({ userId: 1, createdAt: -1 })
ActivitySchema.index({ action: 1, resource: 1 })
ActivitySchema.index({ createdAt: -1 })
