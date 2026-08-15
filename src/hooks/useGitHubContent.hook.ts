import { getOctokit, runWithAuthRetry } from "@/modules/repo/services/octo"
import {
  decodeBase64ToUTF8,
  encodeUTF8ToBase64
} from "@/utils/decodeBase64ToUTF8"
import { confirmMessage, errorMessage } from "@/utils/notif"

const isConflictStatus = (status: number) => status === 409 || status === 422
const isUnauthorizedStatus = (status: number | undefined) => status === 401

/**
 * An aborted request surfaces as a fetch error octokit wraps, so the name we
 * are after can be one level down. Worth telling apart: "the connection died"
 * and "GitHub said no" ask different things of the reader.
 */
const isTimeout = (error: unknown): boolean => {
  const names = [
    (error as { name?: string })?.name,
    (error as { cause?: { name?: string } })?.cause?.name
  ]
  return names.some((name) => name === "TimeoutError" || name === "AbortError")
}

export type FetchShaResult =
  | { kind: "ok"; sha: string | null }
  | { kind: "unauthorized" }
  | { kind: "offline" }

export type FetchFileResult =
  | { kind: "ok"; sha: string; content: string }
  | { kind: "missing" }
  | { kind: "offline" }

export const useGitHubContent = ({
  user,
  repo
}: {
  user: string
  repo: string
}) => {
  const fetchLatestSha = async (path: string): Promise<FetchShaResult> => {
    try {
      const response = await runWithAuthRetry((octokit) =>
        octokit.request("GET /repos/{owner}/{repo}/contents/{+path}", {
          owner: user,
          repo,
          path,
          headers: { "X-GitHub-Api-Version": "2026-03-10" }
        })
      )
      const data = response?.data
      if (Array.isArray(data) || !data) return { kind: "ok", sha: null }
      return { kind: "ok", sha: "sha" in data ? data.sha : null }
    } catch (error) {
      const status = (error as { status?: number })?.status
      if (isUnauthorizedStatus(status)) return { kind: "unauthorized" }
      return { kind: "offline" }
    }
  }

  /**
   * Sha and content in a single contents call. The blob endpoint would need
   * the sha we are trying to learn, so a sync that must know "what is on the
   * remote right now" would otherwise pay two round trips.
   */
  const fetchFile = async (path: string): Promise<FetchFileResult> => {
    try {
      const response = await runWithAuthRetry((octokit) =>
        octokit.request("GET /repos/{owner}/{repo}/contents/{+path}", {
          owner: user,
          repo,
          path,
          headers: { "X-GitHub-Api-Version": "2026-03-10" }
        })
      )
      const file = response?.data
      if (!file || Array.isArray(file) || !("content" in file)) {
        return { kind: "missing" }
      }
      return {
        kind: "ok",
        sha: file.sha,
        content: decodeBase64ToUTF8(file.content)
      }
    } catch {
      return { kind: "offline" }
    }
  }

  const putRaw = async ({
    contentBase64,
    path,
    sha,
    message,
    successMessage,
    conflictMessage,
    failureMessage,
    timeoutMessage,
    timeoutMs,
    silent = false
  }: {
    contentBase64: string
    path: string
    sha?: string
    message: string
    successMessage: string
    conflictMessage: string
    failureMessage: string
    timeoutMessage?: string
    timeoutMs?: number
    silent?: boolean
  }): Promise<{ sha: string | null; conflict: boolean }> => {
    try {
      const octokit = await getOctokit()

      const response = await octokit.request(
        "PUT /repos/{owner}/{repo}/contents/{+path}",
        {
          owner: user,
          repo,
          path,
          message,
          content: contentBase64,
          sha,
          request: timeoutMs
            ? { signal: AbortSignal.timeout(timeoutMs) }
            : undefined
        }
      )

      if (!silent) confirmMessage(successMessage)

      return { sha: response?.data.content?.sha ?? null, conflict: false }
    } catch (error) {
      const status = (error as { status?: number })?.status
      if (status && isConflictStatus(status)) {
        if (!silent) errorMessage(conflictMessage)
        console.warn(error)
        return { sha: null, conflict: true }
      }
      if (!silent) {
        errorMessage(
          timeoutMessage && isTimeout(error) ? timeoutMessage : failureMessage
        )
      }
      console.warn(error)
      return { sha: null, conflict: false }
    }
  }

  const putFile = async ({
    content,
    path,
    sha,
    successMessage = "✅ Note saved",
    silent
  }: {
    content: string
    path: string
    sha?: string
    successMessage?: string
    silent?: boolean
  }): Promise<{ sha: string | null; conflict: boolean }> =>
    putRaw({
      contentBase64: encodeUTF8ToBase64(content),
      path,
      sha,
      silent,
      message: `Updating ${path} from Remanso`,
      successMessage,
      conflictMessage: "⚠ Conflict: this note changed on GitHub",
      failureMessage: "❌ Note could not be saved"
    })

  const uploadBinaryFile = async ({
    base64,
    path
  }: {
    base64: string
    path: string
  }): Promise<{ sha: string | null; conflict: boolean }> =>
    putRaw({
      contentBase64: base64,
      path,
      message: `Uploading ${path} from Remanso`,
      successMessage: "✅ Image uploaded",
      conflictMessage: "⚠ A file already exists at this path on GitHub",
      failureMessage: "❌ Image could not be uploaded",
      timeoutMessage: "❌ Upload timed out — check your connection",
      // A stalled mobile connection otherwise leaves the button spinning with
      // nothing to report; the payload is small enough that this is generous.
      timeoutMs: 60_000
    })

  return {
    fetchLatestSha,
    fetchFile,
    updateFile: async (props: {
      content: string
      path: string
      sha: string
      successMessage?: string
      silent?: boolean
    }) => putFile(props),
    createFile: async (props: { content: string; path: string }) =>
      putFile(props),
    uploadBinaryFile
  }
}
