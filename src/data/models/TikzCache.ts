import { DataType } from "@/data/DataType.enum"
import { Model } from "@/data/models/Model"

export interface TikzCache extends Model<DataType.TikzCache> {
  svg: string
}
