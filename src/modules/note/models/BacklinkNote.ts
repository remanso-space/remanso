import { DataType } from "@/data/DataType.enum"
import { Model } from "@/data/models/Model"
import { Backlink } from "@/modules/note/models/Backlink"

export interface BacklinkNote extends Model<DataType.BacklinkNote> {
  sha: string
  links: Backlink[]
}
