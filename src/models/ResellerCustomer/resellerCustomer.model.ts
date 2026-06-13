import { model } from 'mongoose'
import { ResellerCustomerSchema } from './resellerCustomer.schema'
import { IResellerCustomer } from './resellerCustomer.types'

export const ResellerCustomer = model<IResellerCustomer>('ResellerCustomer', ResellerCustomerSchema)
