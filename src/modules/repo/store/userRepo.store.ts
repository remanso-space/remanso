import { toRaw } from "vue"
import { defineStore } from "pinia"

import { data, generateId } from "@/data/data"
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
  _requestId: number
}

export const useUserRepoStore = defineStore("USER_REPO_STATE", {
  state: (): State => ({
    user: "",
    repo: "",
    files: [],
    readme: undefined,
    userSettings: undefined,
    needToLogin: false,
    _requestId: 0
  }),
  actions: {
    _persistLayout() {
      if (!this.userSettings) return
      try {
        const {
          chosenTitleFont,
          chosenBodyFont,
          chosenFontSize,
          chosenFontFamily,
          pageWidth
        } = this.userSettings
        localStorage.setItem(
          `remanso:layout:${this.user}:${this.repo}`,
          JSON.stringify({
            chosenTitleFont,
            chosenBodyFont,
            chosenFontSize,
            chosenFontFamily,
            pageWidth
          })
        )
      } catch {
        // ignore
      }
    },
    async setUserRepo(user: string, repo: string) {
      const requestId = ++this._requestId
      this.user = user
      this.repo = repo

      let lsLayout: Partial<UserSettings> = {}
      try {
        const lsRaw = localStorage.getItem(`remanso:layout:${user}:${repo}`)
        if (lsRaw) lsLayout = JSON.parse(lsRaw)
      } catch {
        // ignore
      }

      if (Object.keys(lsLayout).length) {
        if (!this.userSettings)
          this.userSettings = { $type: DataType.UserSettings }
        Object.assign(this.userSettings, lsLayout)
      }

      const savedRepoId = generateId(DataType.SavedRepo, `${user}-${repo}`)
      const userSettingsId = `UserSetting-${user}-${repo}`

      const [cachedSavedRepo, cachedUserSettings] = await Promise.all([
        data.get<DataType.SavedRepo, SavedRepo>(savedRepoId),
        data.get<DataType.UserSettings, UserSettings>(userSettingsId)
      ])

      if (requestId !== this._requestId) return

      if (cachedSavedRepo) {
        this.files = cachedSavedRepo.files
      }

      if (cachedUserSettings) {
        // localStorage layout choices take priority over PouchDB cache
        this.userSettings = { ...cachedUserSettings, ...lsLayout }
      }

      try {
        await refreshToken()
      } catch (error) {
        console.warn("impossible to refresh token", error)
      }

      if (requestId !== this._requestId) return

      getFiles(user, repo)
        .then(async (files) => {
          if (requestId !== this._requestId) return
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
          if (requestId !== this._requestId) return
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
          if (userSettings) {
            this.userSettings = userSettings
          } else if (!this.userSettings) {
            this.userSettings = { $type: DataType.UserSettings }
          }

          this.userSettings.chosenFontFamily =
            chosenFontFamily ?? this.userSettings.fontFamily
          this.userSettings.chosenFontSize =
            chosenFontSize ?? this.userSettings.fontSize
          this.userSettings.chosenTitleFont = chosenTitleFont
          this.userSettings.chosenBodyFont = chosenBodyFont

          this._persistLayout()

          // Persist only repo config fields — chosen* are localStorage-only
          const {
            chosenTitleFont: _t,
            chosenBodyFont: _b,
            chosenFontSize: _s,
            chosenFontFamily: _f,
            ...repoConfig
          } = toRaw(this.userSettings)
          data.update<DataType.UserSettings, UserSettings>({
            ...repoConfig,
            _id: userSettingsId
          })
        })

      getCachedMainReadme(user, repo).then(async (cachedReadme) => {
        if (requestId !== this._requestId) return
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

      const savedRepoId = generateId(
        DataType.SavedRepo,
        `${this.user}-${this.repo}`
      )
      const newFiles = [
        ...toRaw(this.files).filter((f) => f.sha !== file.sha),
        toRaw(file)
      ]
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
      this.userSettings = undefined
    },
    resetFiles() {
      this.files = []
      this.readme = null
    },
    setFontFamily(fontFamily: string) {
      if (!this.userSettings) {
        this.userSettings = { $type: DataType.UserSettings }
      }
      this.userSettings.chosenFontFamily = fontFamily
      this._persistLayout()
    },
    setFontSize(fontSize: string) {
      if (!this.userSettings) {
        this.userSettings = { $type: DataType.UserSettings }
      }
      this.userSettings.chosenFontSize = fontSize
      this._persistLayout()
    },
    setTitleFont(font: string) {
      if (!this.userSettings) {
        this.userSettings = { $type: DataType.UserSettings }
      }
      this.userSettings.chosenTitleFont = font
      this._persistLayout()
    },
    setBodyFont(font: string) {
      if (!this.userSettings) {
        this.userSettings = { $type: DataType.UserSettings }
      }
      this.userSettings.chosenBodyFont = font
      this._persistLayout()
    }
  }
})
