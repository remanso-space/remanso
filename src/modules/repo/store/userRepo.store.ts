import { defineStore } from "pinia"

import { data } from "@/data/data"
import { DataType } from "@/data/DataType.enum"
import { RepoFile } from "@/modules/repo/interfaces/RepoFile"
import { UserSettings } from "@/modules/repo/interfaces/UserSettings"
import { SavedRepo } from "@/modules/repo/models/SavedRepo"
import {
  getCachedMainReadme,
  getFiles,
  getMainReadme,
  getUserSettingsContent
} from "@/modules/repo/services/repo"
import { refreshToken } from "@/modules/user/service/signIn"

interface State {
  user: string
  repo: string
  files: RepoFile[]
  readme?: string | null
  userSettings?: UserSettings | null
  needToLogin: boolean
}

export const useUserRepoStore = defineStore("USER_REPO_STATE", {
  state: (): State => ({
    user: "",
    repo: "",
    files: [],
    readme: undefined,
    userSettings: undefined,
    needToLogin: false
  }),
  actions: {
    async setUserRepo(user: string, repo: string) {
      this.user = user
      this.repo = repo

      const savedRepoId = data.generateId(DataType.SavedRepo, `${user}-${repo}`)
      const cachedSavedRepo = await data.get<DataType.SavedRepo, SavedRepo>(
        savedRepoId
      )

      if (cachedSavedRepo) {
        this.files = cachedSavedRepo.files
      }

      try {
        await refreshToken()
      } catch (error) {
        console.warn("impossible to refresh token", error)
      }

      const userSettingsId = `UserSetting-${user}-${repo}`
      const cachedUserSettings = await data.get<
        DataType.UserSettings,
        UserSettings
      >(userSettingsId)

      if (cachedUserSettings) {
        this.userSettings = cachedUserSettings
      }

      getFiles(user, repo)
        .then(async (files) => {
          data.update<DataType.SavedRepo, SavedRepo>({
            _id: savedRepoId,
            $type: DataType.SavedRepo,
            repo,
            user,
            files
          })
          this.files = files
          return getUserSettingsContent(user, repo, files)
        })
        .then((userSettings) => {
          const chosenFontFamily = userSettings?.fontFamilies?.find(
            (font) => font === this.userSettings?.chosenFontFamily
          )
            ? this.userSettings?.chosenFontFamily
            : userSettings?.fontFamily
          const chosenFontSize =
            this.userSettings?.chosenFontSize ?? userSettings?.fontSize
          const chosenTitleFont =
            this.userSettings?.chosenTitleFont ??
            userSettings?.chosenTitleFont ??
            chosenFontFamily
          const chosenBodyFont =
            this.userSettings?.chosenBodyFont ??
            userSettings?.chosenBodyFont ??
            chosenFontFamily
          this.userSettings = userSettings

          if (!this.userSettings) {
            return
          }

          this.userSettings.chosenFontFamily =
            chosenFontFamily ?? this.userSettings.fontFamily
          this.userSettings.chosenFontSize =
            chosenFontSize ?? this.userSettings.fontSize
          this.userSettings.chosenTitleFont = chosenTitleFont
          this.userSettings.chosenBodyFont = chosenBodyFont

          data.update<DataType.UserSettings, UserSettings>({
            ...this.userSettings,
            _id: userSettingsId
          })
        })

      getCachedMainReadme(user, repo).then(async (cachedReadme) => {
        this.readme = cachedReadme
        this.readme = await getMainReadme(user, repo)
      })
    },
    addFile(file: RepoFile) {
      if (!file.sha) {
        return
      }

      const doesFileExist = this.files.some((f) => f.sha === file.sha)

      if (doesFileExist) {
        return
      }

      const savedRepoId = data.generateId(
        DataType.SavedRepo,
        `${this.user}-${this.repo}`
      )
      const newFiles = [...this.files.filter((f) => f.sha !== file.sha), file]
      data.update<DataType.SavedRepo, SavedRepo>({
        _id: savedRepoId,
        $type: DataType.SavedRepo,
        repo: this.repo,
        user: this.user,
        files: newFiles
      })
      this.files = newFiles
    },
    resetUserRepo() {
      this.user = ""
      this.repo = ""
      this.resetFiles()
    },
    resetFiles() {
      this.files = []
      this.readme = null
      this.userSettings = undefined
    },
    setFontFamily(fontFamily: string) {
      if (!this.userSettings) {
        return
      }
      this.userSettings.chosenFontFamily = fontFamily

      const userSettingsId = `UserSetting-${this.user}-${this.repo}`
      data.update<DataType.UserSettings, UserSettings>({
        ...this.userSettings,
        _id: userSettingsId
      })
    },
    setFontSize(fontSize: string) {
      if (!this.userSettings) {
        return
      }
      this.userSettings.chosenFontSize = fontSize

      const userSettingsId = `UserSetting-${this.user}-${this.repo}`
      data.update<DataType.UserSettings, UserSettings>({
        ...this.userSettings,
        _id: userSettingsId
      })
    },
    setTitleFont(font: string) {
      if (!this.userSettings) {
        return
      }
      this.userSettings.chosenTitleFont = font

      const userSettingsId = `UserSetting-${this.user}-${this.repo}`
      data.update<DataType.UserSettings, UserSettings>({
        ...this.userSettings,
        _id: userSettingsId
      })
    },
    setBodyFont(font: string) {
      if (!this.userSettings) {
        return
      }
      this.userSettings.chosenBodyFont = font

      const userSettingsId = `UserSetting-${this.user}-${this.repo}`
      data.update<DataType.UserSettings, UserSettings>({
        ...this.userSettings,
        _id: userSettingsId
      })
    }
  }
})
