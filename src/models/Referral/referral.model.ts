import { model } from 'mongoose'
import { IReferral } from './referral.types'
import { ReferralSchema } from './referral.schema'

export const Referral = model<IReferral>('Referral', ReferralSchema)
