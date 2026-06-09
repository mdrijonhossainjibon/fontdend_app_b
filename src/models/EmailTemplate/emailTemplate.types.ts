import { Document } from 'mongoose'

export interface IEmailTemplate extends Document {
  name: string
  subject: string
  body: string
  variables: string[]
  type: 'verify_email' | 'password_reset' | 'welcome' | 'deposit' | 'withdrawal' | 'notification'
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}
