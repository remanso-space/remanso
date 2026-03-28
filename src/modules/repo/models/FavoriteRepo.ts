import { DataType } from "@/data/DataType.enum"
import { Model } from "@/data/models/Model"

export interface FavoriteRepo extends Model<DataType.FavoriteRepo> {
  isFavorite: boolean
  isPrivate: boolean
  name: string
}
