import { model } from 'mongoose'
import { IActivity } from './activity.types'
import { ActivitySchema } from './activity.schema'

export const Activity = model<IActivity>('Activity', ActivitySchema)
