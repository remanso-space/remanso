import { Octokit } from "@octokit/rest"
import { addMinutes, addSeconds, isBefore } from "date-fns"

import { data } from "@/data/data"
import { DataType } from "@/data/DataType.enum"
import { GithubAccessToken } from "@/data/models/GithubAccessToken"
import { GithubToken } from "@/modules/user/interfaces/GithubToken"
import { GithubTokenError } from "@/modules/user/interfaces/GithubTokenError"

const AUTHENTICATION_SERVER = "https://api.remanso.space/auth/github"
const personalTokenId = "token"

export const signIn = async (
  code: string
): Promise<GithubToken | GithubTokenError> => {
  const authenticationServerURL = new URL(AUTHENTICATION_SERVER)
  authenticationServerURL.searchParams.set("code", code)

  const response = await fetch(authenticationServerURL.toString())
  const body = (await response.json()) as GithubToken | GithubTokenError

  return body
}

export const needToRefreshToken = async () => {
  const accessToken = await data.get<
    DataType.GithubAccessToken,
    GithubAccessToken
  >(data.generateId(DataType.GithubAccessToken, personalTokenId))

  if (!accessToken) {
    return false
  }

  const expirationDate = new Date(accessToken.expirationDate)
  const minimumViableDate = addMinutes(new Date(), 15)

  return isBefore(expirationDate, minimumViableDate)
}

export const refreshToken = async () => {
  const accessToken = await data.get<
    DataType.GithubAccessToken,
    GithubAccessToken
  >(data.generateId(DataType.GithubAccessToken, personalTokenId))

  if (!accessToken) {
    return null
  }

  const needRefresh = await needToRefreshToken()

  if (needRefresh) {
    const authenticationServerURL = new URL(AUTHENTICATION_SERVER)
    authenticationServerURL.searchParams.set("type", "refresh")
    authenticationServerURL.searchParams.set("code", accessToken.refreshToken)

    const response = await fetch(authenticationServerURL.toString())
    const githubToken = (await response.json()) as
      | GithubToken
      | GithubTokenError

    if ("error" in githubToken) {
      return null
    }

    return await saveAccessToken(githubToken)
  }

  return accessToken
}

export const getAccessToken = async () => {
  const response = await data.get<
    DataType.GithubAccessToken,
    GithubAccessToken
  >(data.generateId(DataType.GithubAccessToken, personalTokenId))

  return response
}

export const saveAccessToken = async (githubToken: GithubToken) => {
  const actualPAT = await getAccessToken()

  const expirationDate = addSeconds(
    new Date(),
    githubToken.expires_in
  ).toISOString()

  const refreshTokenExpirationDate = addSeconds(
    new Date(),
    githubToken.refresh_token_expires_in
  ).toISOString()

  const accessToken: GithubAccessToken = {
    ...actualPAT,
    _id: data.generateId(DataType.GithubAccessToken, personalTokenId),
    $type: DataType.GithubAccessToken,
    token: githubToken.access_token,
    expiresIn: githubToken.expires_in,
    expirationDate,
    refreshToken: githubToken.refresh_token,
    refreshTokenExpiresIn: githubToken.refresh_token_expires_in,
    refreshTokenExpirationDate,
    username: ""
  }

  const octokit = new Octokit({
    auth: accessToken?.token
  })

  const user = await octokit.request("GET /user")
  accessToken.username = user.data.login

  await data.add(accessToken)

  return accessToken
}
