import { DataType } from "@/data/DataType.enum"
import { Model } from "@/data/models/Model"

export interface History extends Model<DataType.History> {
  repos: ReadonlyArray<{
    user: string
    repo: string
  }>
}
