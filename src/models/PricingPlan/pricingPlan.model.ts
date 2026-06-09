import { model } from 'mongoose'
import { IPricingPlan } from './pricingPlan.types'
import { PricingPlanSchema } from './pricingPlan.schema'

export const PricingPlan = model<IPricingPlan>('PricingPlan', PricingPlanSchema)
