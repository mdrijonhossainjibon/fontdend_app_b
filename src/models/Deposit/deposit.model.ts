import { model } from 'mongoose'
import { IDeposit } from './deposit.types'
import { DepositSchema } from './deposit.schema'

export const Deposit = model<IDeposit>('Deposit', DepositSchema)
