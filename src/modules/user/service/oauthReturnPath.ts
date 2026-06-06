export const GITHUB_OAUTH_RETURN_PATH_KEY = "github-oauth-return-path"

export const consumeGithubOAuthReturnPath = (): string | null => {
  const path = sessionStorage.getItem(GITHUB_OAUTH_RETURN_PATH_KEY)
  sessionStorage.removeItem(GITHUB_OAUTH_RETURN_PATH_KEY)
  return path
}
