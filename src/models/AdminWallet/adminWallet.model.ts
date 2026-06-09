import { model } from 'mongoose'
import { IAdminWallet } from './adminWallet.types'
import { AdminWalletSchema } from './adminWallet.schema'

export const AdminWallet = model<IAdminWallet>('AdminWallet', AdminWalletSchema)
