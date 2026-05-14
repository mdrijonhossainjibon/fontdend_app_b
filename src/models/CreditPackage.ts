import mongoose, { Schema, Document } from 'mongoose';

export interface ICreditPackage extends Document {
  name: string;
  description: string;
  credits: number;
  price: number;
  currency: string;
  features: string[];
  isActive: boolean;
  isPopular: boolean;
  sortOrder: number;
  image: string | null;
  bonusCredits: number;
  createdAt: Date;
  updatedAt: Date;
}

const creditPackageSchema = new Schema<ICreditPackage>({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  credits: {
    type: Number,
    required: true,
    min: 1
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    default: 'USD',
    uppercase: true
  },
  features: [{
    type: String
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  isPopular: {
    type: Boolean,
    default: false
  },
  sortOrder: {
    type: Number,
    default: 0
  },
  image: {
    type: String,
    default: null
  },
  bonusCredits: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Indexes for faster queries
creditPackageSchema.index({ isActive: 1, sortOrder: 1 });
creditPackageSchema.index({ isPopular: 1 });

// Methods
creditPackageSchema.methods.canUserPurchase = function(user: any) {
  // In a real app, you might have purchase restrictions
  return true;
};

export const CreditPackage = mongoose.model<ICreditPackage>('CreditPackage', creditPackageSchema);