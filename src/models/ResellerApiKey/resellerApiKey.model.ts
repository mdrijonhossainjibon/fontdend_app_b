import { model } from 'mongoose'
import { IResellerApiKey } from './resellerApiKey.types'
import { ResellerApiKeySchema } from './resellerApiKey.schema'

export const ResellerApiKey = model<IResellerApiKey>('ResellerApiKey', ResellerApiKeySchema)
