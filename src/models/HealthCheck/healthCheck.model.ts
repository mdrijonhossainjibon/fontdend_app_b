import { model } from 'mongoose'
import { IHealthCheck } from './healthCheck.types'
import { HealthCheckSchema } from './healthCheck.schema'

export const HealthCheck = model<IHealthCheck>('HealthCheck', HealthCheckSchema)
