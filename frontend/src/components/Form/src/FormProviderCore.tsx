import {defineComponent, onMounted, onBeforeUnmount, provide, inject, ref} from 'vue';
import keycodes from '/@/utils/tinydb/keycodes'
import createRef from '/@/utils/tinydb/createRef'

const contextKey = 'formProviderContextKey'

export function getFormContext(): any {
  return inject(contextKey)
}

export default defineComponent({
  name: 'FormProviderCore',
  setup(_, {slots}) {
    const rootRef = ref<HTMLElement | null>(null)

    const handleEnter = (e) => {
      if (e.keyCode == keycodes.enter) {
        const target = e?.target as HTMLElement | null
        if (!target || !rootRef.value || !rootRef.value.contains(target)) return

        const tag = (target.tagName || '').toUpperCase()
        if (
          tag === 'TEXTAREA' ||
          target.closest?.('.ace_editor') ||
          (target as any).isContentEditable
        ) {
          return
        }

        if (e.shiftKey || e.altKey || e.ctrlKey || e.metaKey) return

        e.preventDefault()
      }
    }

    const context = {
      submitActionRef: createRef(null)
    }

    onMounted(() => {
      window.addEventListener('keydown', handleEnter)
    })

    provide(contextKey, context)

    onBeforeUnmount(() => {
      window.removeEventListener('keydown', handleEnter)
    })

    return () => <div ref={rootRef}>{slots.default?.()}</div>
  }
})
