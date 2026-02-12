import type { ProjectConfig } from "/#/config"

import { defineStore } from "pinia"

import { ThemeEnum } from "/@/enums/appEnum"
import { APP_DARK_MODE_KEY_, PROJ_CFG_KEY } from "/@/enums/cacheEnum"
import { Persistent } from "/@/utils/cache/persistent"
import { deepMerge } from "/@/utils"

interface AppState {
  darkMode?: ThemeEnum
  projectConfig: ProjectConfig | null
}

export const useAppStore = defineStore({
  id: "app",
  state: (): AppState => ({
    darkMode: undefined,
    projectConfig: Persistent.getLocal(PROJ_CFG_KEY),
  }),
  getters: {
    getDarkMode(): "light" | "dark" | string {
      return this.darkMode || localStorage.getItem(APP_DARK_MODE_KEY_) || ThemeEnum.LIGHT
    },
    getProjectConfig(): ProjectConfig {
      return this.projectConfig || ({} as ProjectConfig)
    },
  },
  actions: {
    setDarkMode(mode: ThemeEnum): void {
      this.darkMode = mode
      localStorage.setItem(APP_DARK_MODE_KEY_, mode)
    },
    setProjectConfig(config: DeepPartial<ProjectConfig>): void {
      this.projectConfig = deepMerge(this.projectConfig || {}, config)
      Persistent.setLocal(PROJ_CFG_KEY, this.projectConfig)
    },
  },
})
