import { model } from 'mongoose'
import { ICaptcha } from './captcha.types'
import { CaptchaSchema } from './captcha.schema'

export const Captcha = model<ICaptcha>('Captcha', CaptchaSchema)
