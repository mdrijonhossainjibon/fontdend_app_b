import { model } from 'mongoose'
import { ICaptchaCache } from './captchaCache.types'
import { CaptchaCacheSchema } from './captchaCache.schema'

export const CaptchaCache = model<ICaptchaCache>('CaptchaCache', CaptchaCacheSchema)
