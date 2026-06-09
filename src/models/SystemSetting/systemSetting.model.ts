import { model } from 'mongoose'
import { ISystemSetting } from './systemSetting.types'
import { SystemSettingSchema } from './systemSetting.schema'

export const SystemSetting = model<ISystemSetting>('SystemSetting', SystemSettingSchema)
