import mongoose, { Document, Schema } from 'mongoose'

export interface IPromoOffer extends Document {
    title: string
    badge: string
    description: string
    features: string[]
    highlight: string
    pricingPlanCode: string
    isActive: boolean
    sortOrder: number
    createdAt: Date
    updatedAt: Date
}

const PromoOfferSchema: Schema<IPromoOffer> = new Schema(
    {
        title: {
            type: String,
            required: true,
            trim: true,
        },
        badge: {
            type: String,
            default: '',
            trim: true,
        },
        description: {
            type: String,
            default: '',
        },
        features: {
            type: [String],
            default: [],
        },
        highlight: {
            type: String,
            default: '',
        },
        pricingPlanCode: {
            type: String,
            required: true,
            trim: true,
        },
        isActive: {
            type: Boolean,
            default: true,
            index: true,
        },
        sortOrder: {
            type: Number,
            default: 0,
        },
    },
    { timestamps: true }
)

export const PromoOffer = mongoose.model<IPromoOffer>('PromoOffer', PromoOfferSchema)
