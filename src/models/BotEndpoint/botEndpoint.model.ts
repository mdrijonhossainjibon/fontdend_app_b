import { model, connection } from 'mongoose'
import { IBotEndpoint } from './botEndpoint.types'
import { BotEndpointSchema } from './botEndpoint.schema'

const BotEndpointModel = model<IBotEndpoint>('BotEndpoint', BotEndpointSchema)

// Drop stale unique index on 'name' field (renamed to botName)
connection.once('connected', async () => {
  try {
    const collection = connection.collection('botendpoints')
    const indexes = await collection.indexes()
    const oldIndex = indexes.find(i => i.name === 'name_1')
    if (oldIndex) {
      await collection.dropIndex('name_1')
      console.log('[BotEndpoint] Dropped stale index: name_1')
    }
  } catch {
    // ignore if collection doesn't exist yet
  }
})

export const BotEndpoint = BotEndpointModel
