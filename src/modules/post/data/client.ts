import { initContract } from "@ts-rest/core"
import { initQueryClient } from "@ts-rest/vue-query"
import { type } from "arktype"

const PublicNoteListItem = type({
  did: "string",
  rkey: "string",
  title: "string",
  publishedAt: "string",
  createdAt: "string"
})

export type PublicNoteListItem = typeof PublicNoteListItem.infer

const PublicNote = type({
  did: "string",
  rkey: "string",
  title: "string",
  content: "string",
  publishedAt: "string",
  createdAt: "string"
})

export type PublicNote = typeof PublicNote.infer

const contract = initContract()

export const noteRouter = contract.router({
  noteLists: {
    method: "GET",
    path: "/notes",
    query: contract.type<{ cursor?: string; limit?: number }>(),
    responses: {
      200: contract.type<{ notes: PublicNoteListItem[] }>()
    },
    summary: "List all notes"
  },
  noteListsByDid: {
    method: "GET",
    path: "/:did/notes",
    pathParams: contract.type<{ did: string }>(),
    query: contract.type<{ cursor?: string; limit?: number }>(),
    responses: {
      200: contract.type<{ notes: PublicNoteListItem[] }>()
    },
    summary: "List all notes"
  }
})

export const client = initQueryClient(noteRouter, {
  baseUrl: "https://api.remanso.space"
})
