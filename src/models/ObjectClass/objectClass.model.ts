import { model } from 'mongoose'
import { IObjectClass } from './objectClass.types'
import { ObjectClassSchema } from './objectClass.schema'

export const ObjectClass = model<IObjectClass>('ObjectClass', ObjectClassSchema)
