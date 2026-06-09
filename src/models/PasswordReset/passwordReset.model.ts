import { model } from 'mongoose'
import { IPasswordReset, IPasswordResetModel } from './passwordReset.types'
import { PasswordResetSchema } from './passwordReset.schema'

export const PasswordReset = model<IPasswordReset, IPasswordResetModel>('PasswordReset', PasswordResetSchema)
