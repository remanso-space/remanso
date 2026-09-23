import { DataType } from "@/data/DataType.enum"
import { Model } from "@/data/models/Model"

export interface RepetitionCard extends Model<DataType.RepetitionCard> {
  level: number
  /** ISO string. Documents written before the repo sync hold a `Date`. */
  repeatDate: string | Date
  needsReview: boolean
  /** ISO string of the last answer, used to resolve cross-device conflicts. */
  updatedAt?: string
}
