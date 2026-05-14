import mongoose, { Schema, Document, Model } from 'mongoose'
import bcrypt from 'bcryptjs'

export interface IUser extends Document {
    referralCode?: string
    referredBy?: mongoose.Types.ObjectId
    referralEarnings: number
    email: string
    password: string
    name?: string
    twoFactorEnabled: boolean
    balance: number
    isActive: boolean
    role: string
    oauthProvider?: string
    oauthId?: string
    lastLoginIp?: string
    createdAt: Date
    updatedAt: Date
    comparePassword(candidatePassword: string): Promise<boolean>
}

const UserSchema: Schema<IUser> = new Schema(
    {
        email: {
            type: String,
            required: [true, 'Email is required'],
            unique: true,
            lowercase: true,
            trim: true,
            match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please enter a valid email'],
        },
        password: {
            type: String,
            required: function (this: IUser) {
                // Password is only required if not using OAuth
                return !this.oauthProvider
            },
            minlength: [6, 'Password must be at least 6 characters'],
            select: false, // Don't return password by default
        },
        name: {
            type: String,
            trim: true,
        },
        twoFactorEnabled: {
            type: Boolean,
            default: false,
        },
        balance: {
            type: Number,
            default: 0,
        },
        isActive: {
            type: Boolean,
            default: true,
        },
       role:{
        type: String,
        enum: ['user', 'admin'],
        default: 'user',
       },
        oauthProvider: {
            type: String,
            enum: ['google', 'github', null],
            default: null,
        },
        oauthId: {
            type: String,
            default: null,
        },
        lastLoginIp: {
            type: String,
            default: null,
        },
        referralCode: {
            type: String,
            unique: true,
            sparse: true,
        },
        referredBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            default: null,
        },
        referralEarnings: {
            type: Number,
            default: 0,
        },
    },
    {
        timestamps: true,
    }
)

// Hash password before saving
UserSchema.pre('save', async function () {
    if (!this.isModified('password')) {
        return
    }

    const salt = await bcrypt.genSalt(10)
    this.password = await bcrypt.hash(this.password, salt)
})

// Method to compare password
UserSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
    try {
        return await bcrypt.compare(candidatePassword, this.password)
    } catch (error) {
        return false
    }
}

// Prevent model recompilation in development
export const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>('User', UserSchema)

