import { model } from 'mongoose'
import { ICreditPackage } from './creditPackage.types'
import { CreditPackageSchema } from './creditPackage.schema'

export const CreditPackage = model<ICreditPackage>('CreditPackage', CreditPackageSchema)
