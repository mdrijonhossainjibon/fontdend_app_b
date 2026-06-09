import { Document } from 'mongoose'

export interface ICaptcha extends Document {
  siteKey: string
  secretKey: string
  provider: 'recaptcha' | 'hcaptcha' | 'cloudflare'
  isActive: boolean
  scoreThreshold: number
  createdAt: Date
  updatedAt: Date
}
