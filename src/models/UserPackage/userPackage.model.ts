import { model } from 'mongoose'
import { IPackage } from './userPackage.types'
import { UserPackageSchema } from './userPackage.schema'

export const UserPackage = model<IPackage>('Package', UserPackageSchema)
