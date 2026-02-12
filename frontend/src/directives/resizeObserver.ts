import type {App, Directive} from "vue"
import ResizeObserver from "resize-observer-polyfill"

const resizeObserver: Directive = {
  mounted(node, bindings, ...arg) {
    node.resizeObserver = null
    const {value} = bindings
    const {props} = arg[0]

    const measure = () => {
      const rect = node.getBoundingClientRect()
      props!.resize?.({detail: {width: rect.width, height: rect.height}})
    }

    node.doUpdate = function () {
      const enabled = node._observerEnabled
      if (enabled && !node.resizeObserver) {
        node.resizeObserver = new ResizeObserver(measure)
        node.resizeObserver.observe(node)
      }
      if (!enabled && node.resizeObserver) {
        node.resizeObserver.disconnect()
        node.resizeObserver = null
      }
    }

    node._observerEnabled = value
    node.doUpdate()
    if (value) measure()
  },
  beforeUpdate(node, bindings) {
    node.resizeObserver = null
    node._observerEnabled = bindings.value
    node.doUpdate()
  },
  beforeUnmount(node) {
    if (node.resizeObserver) {
      node.resizeObserver.disconnect()
      node.resizeObserver = null
    }
  },
}

export function setupResizeObserver(app: App) {
  app.directive("resizeObserver", resizeObserver)
}

