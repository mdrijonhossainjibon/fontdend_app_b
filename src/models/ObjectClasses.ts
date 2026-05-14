import mongoose, { Document, Schema } from 'mongoose'

export interface IObjectClass extends Document {
    name: string                    // Name of the object class (e.g., "cow", "lion", "car")
    descriptive_label: string       // Descriptive label used in CLIP prompts
    createdAt: Date
    updatedAt: Date
}

const ObjectClassSchema = new Schema<IObjectClass>(
    {
        name: {
            type: String,
            required: [true, 'Object name is required'],
            unique: true,
            trim: true,
            lowercase: true,
            index: true
        },
        descriptive_label: {
            type: String,
            required: [true, 'Descriptive label is required'],
            trim: true
        },

    },
    {
        timestamps: true
    }
)

// Create indexes for efficient querying
ObjectClassSchema.index({ name: 1 })
ObjectClassSchema.index({ createdAt: -1 })

// Prevent model recompilation in development
export const ObjectClass = mongoose.models.object_classes || mongoose.model<IObjectClass>('object_classes', ObjectClassSchema)

