import { model } from 'mongoose'
import { IBotEndpoint } from './botEndpoint.types'
import { BotEndpointSchema } from './botEndpoint.schema'

export const BotEndpoint = model<IBotEndpoint>('BotEndpoint', BotEndpointSchema)
