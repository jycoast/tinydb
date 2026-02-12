import type { App } from "vue"
import { setupSplitterDrag } from "./splitterDrag"

export function setupGlobDirectives(app: App) {
  setupSplitterDrag(app)
}
