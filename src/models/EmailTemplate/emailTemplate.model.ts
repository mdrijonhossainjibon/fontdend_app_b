import { model } from 'mongoose'
import { IEmailTemplate } from './emailTemplate.types'
import { EmailTemplateSchema } from './emailTemplate.schema'

export const EmailTemplate = model<IEmailTemplate>('EmailTemplate', EmailTemplateSchema)
