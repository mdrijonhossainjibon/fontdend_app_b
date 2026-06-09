import { model } from 'mongoose'
import { IAnalyticsEvent } from './analyticsEvent.types'
import { AnalyticsEventSchema } from './analyticsEvent.schema'

export const AnalyticsEvent = model<IAnalyticsEvent>('AnalyticsEvent', AnalyticsEventSchema)
