import { model } from 'mongoose'
import { IExtension } from './extension.types'
import { ExtensionSchema } from './extension.schema'

export const Extension = model<IExtension>('Extension', ExtensionSchema)
