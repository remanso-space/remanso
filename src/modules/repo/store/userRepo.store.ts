import { defineStore } from "pinia"
import { toRaw } from "vue"

import { data, generateId } from "@/data/data"
import { DataType } from "@/data/DataType.enum"
import { RepoFile } from "@/modules/repo/interfaces/RepoFile"
import { UserSettings } from "@/modules/repo/interfaces/UserSettings"
import { SavedRepo } from "@/modules/repo/models/SavedRepo"
import {
  getCachedMainReadme,
  getFiles,
  getMainReadme,
  getRepoPermission,
  getUserSettingsContent
} from "@/modules/repo/services/repo"
import { refreshToken } from "@/modules/user/service/signIn"

export type RepoLoadError = "auth" | "network" | null

interface State {
  user: string
  repo: string
  files: RepoFile[]
  readme?: string | null
  userSettings?: UserSettings | null
  needToLogin: boolean
  loadError: RepoLoadError
  canPush: boolean
  _requestId: number
}

const classifyLoadError = (error: unknown): "auth" | "network" => {
  if (error && typeof error === "object") {
    const e = error as { name?: string; status?: number }
    if (e.name === "TimeoutError" || e.name === "AbortError") return "network"
    if (e.status === 401 || e.status === 403 || e.status === 404) return "auth"
    if (typeof e.status === "number" && e.status >= 500) return "network"
  }
  return "network"
}

export const useUserRepoStore = defineStore("USER_REPO_STATE", {
  state: (): State => ({
    user: "",
    repo: "",
    files: [],
    readme: undefined,
    userSettings: undefined,
    needToLogin: false,
    loadError: null,
    canPush: false,
    _requestId: 0
  }),
  actions: {
    _persistLayout() {
      if (!this.userSettings) return
      try {
        const {
          chosenHeadingFont,
          chosenBodyFont,
          chosenFontSize,
          chosenFontFamily,
          pageWidth
        } = this.userSettings
        localStorage.setItem(
          `remanso:layout:${this.user}:${this.repo}`,
          JSON.stringify({
            chosenHeadingFont,
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
      this.loadError = null
      this.canPush = false

      let lsLayout: Partial<UserSettings> = {}
      try {
        const lsRaw = localStorage.getItem(`remanso:layout:${user}:${repo}`)
        if (lsRaw) {
          const parsed = JSON.parse(lsRaw) as Partial<UserSettings> & {
            chosenTitleFont?: string
          }
          // Migrate the pre-rename key so a saved heading font survives.
          if (parsed.chosenTitleFont && !parsed.chosenHeadingFont) {
            parsed.chosenHeadingFont = parsed.chosenTitleFont
          }
          delete parsed.chosenTitleFont
          lsLayout = parsed
        }
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

      getRepoPermission(user, repo)
        .then((canPush) => {
          if (requestId !== this._requestId) return
          this.canPush = canPush
        })
        .catch((error) => {
          if (requestId !== this._requestId) return
          console.warn("getRepoPermission failed", error)
          this.canPush = false
        })

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
          const chosenHeadingFont =
            this.userSettings?.chosenHeadingFont ??
            userSettings?.chosenHeadingFont ??
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
          this.userSettings.chosenHeadingFont = chosenHeadingFont
          this.userSettings.chosenBodyFont = chosenBodyFont

          this._persistLayout()

          // Persist only repo config fields — chosen* are localStorage-only
          const {
            chosenHeadingFont: _h,
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
        .catch((error) => {
          if (requestId !== this._requestId) return
          console.warn("getFiles failed", error)
          this.loadError = classifyLoadError(error)
        })

      getCachedMainReadme(user, repo)
        .then(async (cachedReadme) => {
          if (requestId !== this._requestId) return
          if (cachedReadme) this.readme = cachedReadme
          const fetched = await getMainReadme(user, repo)
          if (requestId !== this._requestId) return
          this.readme = fetched
        })
        .catch((error) => {
          if (requestId !== this._requestId) return
          console.warn("getMainReadme failed", error)
          // Only surface the error UI if we have nothing cached to display.
          if (!this.readme) {
            this.readme = null
            this.loadError = classifyLoadError(error)
          }
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
        ...toRaw(this.files).filter(
          (f) => f.sha !== file.sha && f.path !== file.path
        ),
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
    registerUploadedFile(file: RepoFile) {
      if (!file.path) {
        return
      }

      const savedRepoId = generateId(
        DataType.SavedRepo,
        `${this.user}-${this.repo}`
      )
      const newFiles = [
        ...toRaw(this.files).filter((f) => f.path !== file.path),
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
      this.canPush = false
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
    setHeadingFont(font: string) {
      if (!this.userSettings) {
        this.userSettings = { $type: DataType.UserSettings }
      }
      this.userSettings.chosenHeadingFont = font
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
