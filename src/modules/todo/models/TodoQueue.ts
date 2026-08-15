import { DataType } from "@/data/DataType.enum"
import { Model } from "@/data/models/Model"
import { TodoOp } from "@/modules/todo/models/TodoOp"

// The local truth for a todo file: the last content we knew the remote held,
// plus every change made since that has not landed there yet.
export interface TodoQueue extends Model<DataType.TodoQueue> {
  user: string
  repo: string
  path: string
  content: string
  sha: string
  ops: TodoOp[]
}
