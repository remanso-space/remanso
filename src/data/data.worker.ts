import { expose } from "comlink"
import { nanoid } from "nanoid"
import indexedDb from "pouchdb-adapter-indexeddb"
import PouchDb from "pouchdb-browser"

import { DataType } from "./DataType.enum"
import { Model } from "./models/Model"

PouchDb.plugin(indexedDb)

interface GetAllParams {
  prefix?: string
  includeDocs?: boolean
  includeAttachments?: boolean
  keys?: string[]
}

class Data {
  // oxlint-disable-next-line typescript/ban-types
  private readonly locale: PouchDB.Database<{}> | null = null

  constructor() {
    try {
      this.locale = new PouchDb("remanso", {
        adapter: "indexeddb"
      })
    } catch (error) {
      console.warn("data error", error)
    }
  }

  private buildId(type?: DataType | string, id?: string): string {
    if (!type) return id || nanoid()
    return `${type}-${id || nanoid()}`
  }

  public async add<DT extends DataType>(model: Model<DT>): Promise<boolean> {
    try {
      const result = await this.locale?.put(model)
      return result?.ok ?? false
    } catch (error) {
      console.warn(error)
      return false
    }
  }

  public async update<DT extends DataType, T extends Model<DT>>(
    model: T
  ): Promise<boolean> {
    try {
      if (!model._id) {
        const result = await this.locale?.put(model)
        return result?.ok ?? false
      }

      const oldModel = await this.get(model._id)
      if (oldModel) {
        const result = await this.locale?.put({ ...oldModel, ...model })
        return result?.ok ?? false
      }

      const result = await this.locale?.put(model)
      return result?.ok ?? false
    } catch (error) {
      console.warn(error)
      return false
    }
  }

  public async bulkUpdate<DT extends DataType, T extends Model<DT>>(
    models: T[]
  ): Promise<boolean> {
    if (!this.locale || !models.length) return false
    try {
      const result = await this.locale.bulkDocs(models)
      return result.every((r) => "ok" in r && r.ok)
    } catch (error) {
      console.warn(error)
      return false
    }
  }

  public async remove(id: string): Promise<boolean> {
    try {
      const doc = await this.get(id)
      if (!doc) {
        return false
      }
      const result = await this.locale?.put({
        ...doc,
        _deleted: true
      })
      return result?.ok ?? false
    } catch {
      return false
    }
  }

  public async get<DT extends DataType, T extends Model<DT>>(
    id: string
  ): Promise<T | null> {
    try {
      return ((await this.locale?.get(id)) as T) || null
    } catch {
      return null
    }
  }

  public async getOrCreate<DT extends DataType, T extends Model<DT>>(
    id: string,
    initialValue: T
  ): Promise<T> {
    const element = await this.get<DT, T>(id)

    if (element) {
      return element
    }

    await this.add<DT>({ ...initialValue, _id: id })

    return this.getOrCreate(id, initialValue)
  }

  public async getAll<DT extends DataType, T extends Model<DT>>({
    prefix,
    includeDocs = true,
    includeAttachments = false,
    keys = []
  }: GetAllParams): Promise<T[]> {
    if (!this.locale) {
      return []
    }

    if (keys.length) {
      const response = await this.locale.allDocs({
        include_docs: includeDocs,
        attachments: includeAttachments,
        keys: keys.map((key) => this.buildId(prefix, key))
      })

      if (includeDocs) {
        return response.rows
          .map((row) => {
            if ("error" in row) return null
            return row.doc
          })
          .filter(Boolean) as T[]
      } else {
        return response.rows
          .map((row) => {
            if ("error" in row) return null
            return { _id: row.id }
          })
          .filter(Boolean) as T[]
      }
    }

    const response = await this.locale.allDocs({
      include_docs: includeDocs,
      attachments: includeAttachments,
      startkey: prefix ? prefix : undefined,
      endkey: prefix ? `${prefix}\ufff0` : undefined
    })

    return response.rows.map((row) => row.doc) as T[]
  }
}

expose(new Data())
