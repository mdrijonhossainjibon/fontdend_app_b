import { Document } from 'mongoose'

export interface IObjectClass extends Document {
  name: string
  descriptiveLabel: string
  createdAt: Date
  updatedAt: Date
}
