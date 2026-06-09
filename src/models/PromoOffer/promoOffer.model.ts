import { model } from 'mongoose'
import { IPromoOffer } from './promoOffer.types'
import { PromoOfferSchema } from './promoOffer.schema'

export const PromoOffer = model<IPromoOffer>('PromoOffer', PromoOfferSchema)
