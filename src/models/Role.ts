import mongoose, { Schema, Document } from 'mongoose';

export interface IRole extends Document {
  name: string;
  slug: string;
  description: string;
  permissions: string[];
  status: 'active' | 'inactive';
  createdAt: Date;
  updatedAt: Date;
}

const RoleSchema = new Schema<IRole>(
  {
    name: { type: String, required: true, unique: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    description: { type: String, default: '' },
    permissions: [{ type: String }],
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  },
  { timestamps: true },
);

export const Role = mongoose.model<IRole>('Role', RoleSchema);
