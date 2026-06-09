import { model } from 'mongoose'
import { ITransaction } from './transaction.types'
import { TransactionSchema } from './transaction.schema'

export const Transaction = model<ITransaction>('Transaction', TransactionSchema)
