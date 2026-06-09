import { model } from 'mongoose'
import { IRole } from './role.types'
import { RoleSchema } from './role.schema'

export const Role = model<IRole>('Role', RoleSchema)
