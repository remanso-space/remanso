import { getOctokit } from "@/modules/repo/services/octo"
import { encodeUTF8ToBase64 } from "@/utils/decodeBase64ToUTF8"
import { confirmMessage, errorMessage } from "@/utils/notif"

export const useGitHubContent = ({
  user,
  repo
}: {
  user: string
  repo: string
}) => {
  const putFile = async ({
    content,
    path,
    sha
  }: {
    content: string
    path: string
    sha?: string
  }) => {
    try {
      const octokit = await getOctokit()

      const response = await octokit.request(
        `PUT /repos/{owner}/{repo}/contents/{path}`,
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

      return response?.data.content?.sha ?? null
    } catch (error) {
      errorMessage("❌ Note could not be saved")
      console.warn(error)
    }

    return null
  }

  return {
    updateFile: async (props: { content: string; path: string; sha: string }) =>
      putFile(props),
    createFile: async (props: { content: string; path: string }) =>
      putFile(props)
  }
}
