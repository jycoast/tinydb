import type { EngineDriver } from "./engines"

export interface ExtensionsDirectory {
  plugins: {
    packageName: string
    manifest: any
    content: any
  }[]
  drivers: EngineDriver[]
}
