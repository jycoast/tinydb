import type {App} from "vue"
import {setupSplitterDrag} from "./splitterDrag"
import {setupResizeObserver} from "./resizeObserver"

export function setupGlobDirectives(app: App) {
  setupSplitterDrag(app)
  setupResizeObserver(app)
}
