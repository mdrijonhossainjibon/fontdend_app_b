import { model } from 'mongoose'
import { ISmtpSetting } from './smtpSetting.types'
import { SmtpSettingSchema } from './smtpSetting.schema'

export const SmtpSetting = model<ISmtpSetting>('SmtpSetting', SmtpSettingSchema)
