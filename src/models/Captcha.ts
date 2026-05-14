import mongoose, { Schema, Document } from 'mongoose';

export interface ICaptcha extends Document {
  userId: string;
  captchaId: string;
  type: string;
  image: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  result?: string;
  error?: string;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const captchaSchema = new Schema<ICaptcha>({
  userId: {
    type: String,
    required: true,
    ref: 'User'
  },
  captchaId: {
    type: String,
    required: true,
    unique: true,
    default: () => `captcha_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  },
  type: {
    type: String,
    required: true,
    enum: ['text-captcha', 'math-captcha', 'image-captcha', 'recaptcha']
  },
  image: {
    type: String,
    required: true
  },
  status: {
    type: String,
    required: true,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending'
  },
  result: {
    type: String,
    trim: true
  },
  error: {
    type: String,
    trim: true
  },
  completedAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Index for faster queries
captchaSchema.index({ userId: 1, createdAt: -1 });
captchaSchema.index({ captchaId: 1 });
captchaSchema.index({ status: 1 });

export const Captcha = mongoose.model<ICaptcha>('Captcha', captchaSchema);