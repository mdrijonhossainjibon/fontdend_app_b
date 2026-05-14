import mongoose, { Document, Schema } from 'mongoose'

export interface ISolution extends Document {
    hash: string
    question: string
    type: 'objectClassify' | 'objectClick' | 'objectDrag' | 'objectTag' | 'grid' | 'unknown'
    service: 'hcaptcha' | 'awswaf' | 'recaptcha' | 'unknown'
    solution: any
    imageData?: string[]    // base64 captcha tile images
    examples?: string[]     // base64 reference/example images
    classNames?: string[]   // detected object class names
    apiKeyId?: mongoose.Types.ObjectId
    userId?: mongoose.Types.ObjectId
}


const SolutionSchema: Schema<ISolution> = new Schema(
    {
        hash: {
            type: String,
            required: true,
            unique: true,
            index: true,
        },
        question: {
            type: String,
            default: '',
            trim: true,
        },
        type: {
            type: String,
            enum: ['objectClassify', 'objectClick', 'objectDrag', 'objectTag', 'grid', 'unknown'],
            default: 'objectClassify',
            index: true,
        },
        service: {
            type: String,
            enum: ['hcaptcha', 'awswaf', 'recaptcha', 'unknown'],
            default: 'hcaptcha',
            index: true,
        },
        solution: {
            type: Schema.Types.Mixed,
            required: true,
        },
        imageData: {
            type: [String],
            default: [],
        },
        examples: {
            type: [String],   // reference/example images for fit/reference challenges
            default: [],
        },
        classNames: {
            type: [String],   // detected object class names
            default: [],
        },
        apiKeyId: {
            type: Schema.Types.ObjectId,
            ref: 'ApiKey',
            default: null,
        },
        userId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            default: null,
        },

    },
    {
        timestamps: true,
    }
)
 

// Compound index for faster admin queries
SolutionSchema.index({ service: 1, type: 1, createdAt: -1 })

export const Solution = mongoose.models.Solution || mongoose.model<ISolution>('Solution', SolutionSchema)

