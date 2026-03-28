import { DataType } from "@/data/DataType.enum"
import { Model } from "@/data/models/Model"

export interface RepetitionCard extends Model<DataType.RepetitionCard> {
  level: number
  repeatDate: Date
  needsReview: boolean
}
