import { model } from 'mongoose'
import { IOtp } from './otp.types'
import { OtpSchema } from './otp.schema'

export const Otp = model<IOtp>('Otp', OtpSchema)
