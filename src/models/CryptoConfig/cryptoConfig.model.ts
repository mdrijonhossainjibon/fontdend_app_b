import { model } from 'mongoose'
import { ICryptoConfig } from './cryptoConfig.types'
import { CryptoConfigSchema } from './cryptoConfig.schema'

export const CryptoConfig = model<ICryptoConfig>('CryptoConfig', CryptoConfigSchema)
