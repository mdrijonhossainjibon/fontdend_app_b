import { Document } from 'mongoose'

export interface ICaptchaCache extends Document {
  imageHash: string
  imageData: string
  question: string
  answer: number[]
  rawResponse: unknown
  createdAt: Date
}
