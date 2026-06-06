import { beforeEach, describe, expect, it } from "vitest"

import {
  consumeGithubOAuthReturnPath,
  GITHUB_OAUTH_RETURN_PATH_KEY
} from "./oauthReturnPath"

describe("consumeGithubOAuthReturnPath", () => {
  beforeEach(() => {
    sessionStorage.clear()
  })

  it("returns the stored path and clears the key", () => {
    sessionStorage.setItem(GITHUB_OAUTH_RETURN_PATH_KEY, "/alice/notes")

    expect(consumeGithubOAuthReturnPath()).toBe("/alice/notes")
    expect(sessionStorage.getItem(GITHUB_OAUTH_RETURN_PATH_KEY)).toBeNull()
  })

  it("returns null when nothing is stored", () => {
    expect(consumeGithubOAuthReturnPath()).toBeNull()
  })

  it("returns null on the second call (consume-once semantics)", () => {
    sessionStorage.setItem(GITHUB_OAUTH_RETURN_PATH_KEY, "/x")

    expect(consumeGithubOAuthReturnPath()).toBe("/x")
    expect(consumeGithubOAuthReturnPath()).toBeNull()
  })
})
