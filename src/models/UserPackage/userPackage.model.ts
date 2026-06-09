import { model } from 'mongoose'
import { IUserPackage } from './userPackage.types'
import { UserPackageSchema } from './userPackage.schema'

export const UserPackage = model<IUserPackage>('UserPackage', UserPackageSchema)
