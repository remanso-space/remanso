import { DataType } from "@/data/DataType.enum"
import { Model } from "@/data/models/Model"
import { RepoFile } from "@/modules/repo/interfaces/RepoFile"

export interface SavedRepo extends Model<DataType.SavedRepo> {
  user: string
  repo: string
  files: RepoFile[]
}
