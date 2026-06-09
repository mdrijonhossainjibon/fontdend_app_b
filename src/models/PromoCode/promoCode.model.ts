import { model } from 'mongoose'
import { IPromoCode } from './promoCode.types'
import { PromoCodeSchema } from './promoCode.schema'

export const PromoCode = model<IPromoCode>('PromoCode', PromoCodeSchema)
