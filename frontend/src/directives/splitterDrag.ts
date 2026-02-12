import type {App, Directive} from "vue"

const splitterDrag: Directive = {
  mounted(node, bindings, ...arg) {
    node.resizeStart = null
    const {value} = bindings
    const axes = value
    const {props} = arg[0]

    node.handleResizeDown = (e: MouseEvent) => {
      node.resizeStart = e[axes]
      document.addEventListener("mousemove", node.handleResizeMove, true)
      document.addEventListener("mouseup", node.handleResizeEnd, true)
    }

    node.handleResizeMove = (e: MouseEvent) => {
      e.preventDefault()
      const diff = e[axes] - node.resizeStart!
      node.resizeStart = e[axes]
      props!.resizeSplitter?.({detail: diff})
    }

    node.handleResizeEnd = (e: MouseEvent) => {
      e.preventDefault()
      node.resizeStart = null
      document.removeEventListener("mousemove", node.handleResizeMove, true)
      document.removeEventListener("mouseup", node.handleResizeEnd, true)
    }

    node.addEventListener("mousedown", node.handleResizeDown)
  },
  beforeUnmount(node) {
    node.removeEventListener("mousedown", node.handleResizeDown)
    if (node.resizeStart != null) {
      document.removeEventListener("mousemove", node.handleResizeMove, true)
      document.removeEventListener("mouseup", node.handleResizeEnd, true)
    }
  },
}

export function setupSplitterDrag(app: App) {
  app.directive("splitterDrag", splitterDrag)
}

