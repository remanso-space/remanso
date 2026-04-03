import { DataType } from "@/data/DataType.enum"
import { Model } from "@/data/models/Model"

export interface GithubAccessToken extends Model<DataType.GithubAccessToken> {
  username: string
  token: string
  expirationDate: string
  expiresIn: number
  refreshToken: string
  refreshTokenExpiresIn: number
  refreshTokenExpirationDate: string
}
