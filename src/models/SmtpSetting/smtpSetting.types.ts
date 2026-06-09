import { Document } from 'mongoose'

export interface ISmtpSetting extends Document {
  host: string
  port: number
  username: string
  password: string
  fromEmail: string
  fromName: string
  isSecure: boolean
  status: 'active' | 'inactive'
  rateLimit: number
  maxConnections: number
  lastTestedAt?: Date
  lastTestStatus?: boolean
  createdAt: Date
  updatedAt: Date
}
