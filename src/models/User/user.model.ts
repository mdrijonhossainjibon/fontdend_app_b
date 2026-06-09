import { Model, model } from 'mongoose'
import { IUser, IUserMethods } from './user.types'
import { UserSchema } from './user.schema'

// Extend Model type with static methods
export interface IUserModel extends Model<IUser, Record<string, never>, IUserMethods> {
  findByEmail(email: string): Promise<IUser | null>
}

export const User = model<IUser, IUserModel>('User', UserSchema)
