import { model } from 'mongoose'
import { ISolution } from './solution.types'
import { SolutionSchema } from './solution.schema'

export const Solution = model<ISolution>('Solution', SolutionSchema)
