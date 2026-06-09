import { model } from 'mongoose'
import { IDepositAddress } from './depositAddress.types'
import { DepositAddressSchema } from './depositAddress.schema'

export const DepositAddress = model<IDepositAddress>('DepositAddress', DepositAddressSchema)
