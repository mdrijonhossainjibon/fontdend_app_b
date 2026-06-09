import { model } from 'mongoose'
import { IBotConfig } from './botConfig.types'
import { BotConfigSchema } from './botConfig.schema'

export const BotConfig = model<IBotConfig>('BotConfig', BotConfigSchema)
