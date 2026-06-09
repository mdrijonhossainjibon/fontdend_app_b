import { model } from 'mongoose'
import { IUsage } from './usage.types'
import { UsageSchema } from './usage.schema'

export const Usage = model<IUsage>('Usage', UsageSchema)
