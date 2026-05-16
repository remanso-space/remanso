import { wrap } from "comlink"
import { nanoid } from "nanoid"

import { DataType } from "./DataType.enum"
import { Model } from "./models/Model"

export interface DataApi {
  add<DT extends DataType>(model: Model<DT>): Promise<boolean>
  update<DT extends DataType, T extends Model<DT>>(model: T): Promise<boolean>
  bulkUpdate<DT extends DataType, T extends Model<DT>>(
    models: T[]
  ): Promise<boolean>
  remove(id: string): Promise<boolean>
  get<DT extends DataType, T extends Model<DT>>(id: string): Promise<T | null>
  getOrCreate<DT extends DataType, T extends Model<DT>>(
    id: string,
    initialValue: T
  ): Promise<T>
  getAll<DT extends DataType, T extends Model<DT>>(params: {
    prefix?: string
    includeDocs?: boolean
    includeAttachments?: boolean
    keys?: string[]
  }): Promise<T[]>
}

export const generateId = (type?: DataType | string, id?: string): string => {
  if (!type) return id || nanoid()
  return `${type}-${id || nanoid()}`
}

import DataWorker from "./data.worker?worker"

export const data = wrap(new DataWorker()) as unknown as DataApi
