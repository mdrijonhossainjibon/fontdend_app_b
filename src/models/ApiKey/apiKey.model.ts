import { model } from 'mongoose'
import { IApiKey } from './apiKey.types'
import { ApiKeySchema } from './apiKey.schema'

export const ApiKey = model<IApiKey>('ApiKey', ApiKeySchema)
