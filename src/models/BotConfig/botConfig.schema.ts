import { Schema } from 'mongoose'
import { IBotConfig } from './botConfig.types'

export const BotConfigSchema = new Schema<IBotConfig>(
  {
    key: { type: String, required: true, unique: true, trim: true },
    value: { type: String, required: true },
    description: { type: String, trim: true },
    isEncrypted: { type: Boolean, default: false },
  },
  { timestamps: true }
)

BotConfigSchema.index({ key: 1 })
