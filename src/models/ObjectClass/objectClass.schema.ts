import { Schema } from 'mongoose'
import { IObjectClass } from './objectClass.types'

export const ObjectClassSchema = new Schema<IObjectClass>(
  {
    name: { type: String, required: true, unique: true, trim: true, lowercase: true },
    descriptiveLabel: { type: String, required: true, trim: true },
  },
  { timestamps: true }
)
ObjectClassSchema.index({ name: 1 })
