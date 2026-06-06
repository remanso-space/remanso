import { markdownBuilder } from "@/hooks/useMarkdown.hook"
import { prepareNoteCache } from "@/modules/note/cache/prepareNoteCache"
import { RepoFile } from "@/modules/repo/interfaces/RepoFile"
import { UserSettings } from "@/modules/repo/interfaces/UserSettings"
import { getOctokit, runWithAuthRetry } from "@/modules/repo/services/octo"

export const getRepoPermission = async (
  owner: string,
  repo: string
): Promise<boolean> => {
  if (!owner || !repo) {
    return false
  }
  const octokit = await getOctokit()
  const { data } = await octokit.repos.get({ owner, repo })
  return data.permissions?.push ?? false
}

export const getFiles = async (
  owner: string,
  repo: string
): Promise<RepoFile[]> => {
  if (!owner || !repo) {
    return []
  }
  const octokit = await getOctokit()

  const commits = await octokit.request("GET /repos/{owner}/{repo}/commits", {
    owner,
    repo
  })

  const lastCommit = commits.data.shift()

  if (!lastCommit) {
    return []
  }

  const treeResponse = await octokit.request(
    "GET /repos/{owner}/{repo}/git/trees/{tree_sha}",
    {
      owner,
      repo,
      tree_sha: lastCommit.commit.tree.sha,
      recursive: "true",
      request: { signal: AbortSignal.timeout(20_000) }
    }
  )

  return treeResponse?.data.tree.filter((t) => t.type === "blob") ?? []
}

export const getCachedMainReadme = async (owner: string, repo: string) => {
  if (!owner || !repo) {
    return null
  }
  const { render } = markdownBuilder()

  const { getCachedNote } = prepareNoteCache(`${owner}-${repo}-README`)
  const { note: cachedReadme } = await getCachedNote()

  if (!cachedReadme) {
    return null
  }

  return render(cachedReadme.content)
}

export const getMainReadme = async (owner: string, repo: string) => {
  if (!owner || !repo) {
    return null
  }

  const { render } = markdownBuilder()
  const { getCachedNote, saveCacheNote } = prepareNoteCache(
    `${owner}-${repo}-README`
  )

  try {
    const octokit = await getOctokit()

    const README = await octokit.repos.getReadme({
      owner,
      repo
    })

    if (README) {
      saveCacheNote(README.data.content)
      return render(README.data.content)
    }
  } catch (error) {
    console.warn(error)
    const { note: cachedReadme } = await getCachedNote()

    if (cachedReadme) {
      return render(cachedReadme.content)
    }

    // No cached fallback — surface the error so the caller can classify
    // network/timeout failures vs auth/404 and tailor the UI accordingly.
    throw error
  }

  return null
}

export const getUserSettingsContent = async (
  user: string,
  repo: string,
  files: RepoFile[]
): Promise<Omit<UserSettings, "chosenFontFamily"> | null> => {
  const configFile = files.find((file) => file.path === ".remanso.json")

  if (!configFile?.sha) {
    return null
  }

  const content = await queryFileContent(user, repo, configFile.sha)

  if (!content) {
    return null
  }

  const raw = JSON.parse(atob(content)) as UserSettings & {
    t?: string
    p?: string
  }
  const { t, p, ...rest } = raw
  return {
    ...rest,
    chosenTitleFont: t,
    chosenBodyFont: p
  }
}

export const queryFileContent = async (
  user: string,
  repo: string,
  sha: string
) => {
  if (!user || !repo) {
    return null
  }

  try {
    const file = await runWithAuthRetry((octokit) =>
      octokit.request("GET /repos/{owner}/{repo}/git/blobs/{file_sha}", {
        owner: user,
        repo: repo,
        file_sha: sha
      })
    )
    return file?.data.content ?? null
  } catch (error) {
    console.warn("queryFileContent failed", { user, repo, sha, error })
    return null
  }
}
