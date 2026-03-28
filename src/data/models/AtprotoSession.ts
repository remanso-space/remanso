import { DataType } from "@/data/DataType.enum"
import { Model } from "@/data/models/Model"

export interface AtprotoSession extends Model<DataType.AtprotoSession> {
  did: string
  handle: string
}
