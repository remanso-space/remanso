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
    query: type({
      cursor: "string | undefined",
      limit: "number | undefined"
    }),
    responses: {
      200: type({
        notes: PublicNoteListItem.array()
      })
    },
    summary: "List all notes"
  },
  noteListsByDid: {
    method: "GET",
    path: "/:did/notes",
    pathParams: type({
      did: "string"
    }),
    query: type({
      cursor: "string | undefined",
      limit: "number | undefined"
    }),
    responses: {
      200: type({
        notes: PublicNoteListItem.array()
      })
    },
    summary: "List all notes"
  }
})

export const client = initQueryClient(noteRouter, {
  baseUrl: "https://api.remanso.space"
})
