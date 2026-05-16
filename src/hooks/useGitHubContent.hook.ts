import { getOctokit } from "@/modules/repo/services/octo"
import { encodeUTF8ToBase64 } from "@/utils/decodeBase64ToUTF8"
import { confirmMessage, errorMessage } from "@/utils/notif"

const isConflictStatus = (status: number) => status === 409 || status === 422

export const useGitHubContent = ({
  user,
  repo
}: {
  user: string
  repo: string
}) => {
  const fetchLatestSha = async (path: string): Promise<string | null> => {
    try {
      const octokit = await getOctokit()
      const response = await octokit.request(
        "GET /repos/{owner}/{repo}/contents/{+path}",
        {
          owner: user,
          repo,
          path,
          headers: { "X-GitHub-Api-Version": "2026-03-10" }
        }
      )
      const data = response?.data
      if (Array.isArray(data) || !data) return null
      return "sha" in data ? data.sha : null
    } catch {
      return null
    }
  }

  const putFile = async ({
    content,
    path,
    sha
  }: {
    content: string
    path: string
    sha?: string
  }): Promise<{ sha: string | null; conflict: boolean }> => {
    try {
      const octokit = await getOctokit()

      const response = await octokit.request(
        "PUT /repos/{owner}/{repo}/contents/{+path}",
        {
          owner: user,
          repo,
          path,
          message: `Updating ${path} from Remanso`,
          content: encodeUTF8ToBase64(content),
          sha
        }
      )

      confirmMessage("✅ Note saved")

      return { sha: response?.data.content?.sha ?? null, conflict: false }
    } catch (error) {
      const status = (error as { status?: number })?.status
      if (status && isConflictStatus(status)) {
        errorMessage("⚠ Conflict: this note changed on GitHub")
        console.warn(error)
        return { sha: null, conflict: true }
      }
      errorMessage("❌ Note could not be saved")
      console.warn(error)
      return { sha: null, conflict: false }
    }
  }

  return {
    fetchLatestSha,
    updateFile: async (props: {
      content: string
      path: string
      sha: string
    }) => putFile(props),
    createFile: async (props: { content: string; path: string }) =>
      putFile(props)
  }
}
