import {defineComponent, onMounted, onBeforeUnmount, provide, inject, ref} from 'vue';
import keycodes from '/@/second/utility/keycodes'
import createRef from '/@/second/utility/createRef'

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
        // Only handle Enter for elements inside this provider (eg. a modal/form).
        if (!target || !rootRef.value || !rootRef.value.contains(target)) return

        // Never block Enter inside editors / multi-line inputs.
        const tag = (target.tagName || '').toUpperCase()
        if (
          tag === 'TEXTAREA' ||
          // Ace editor
          target.closest?.('.ace_editor') ||
          // contenteditable editors
          (target as any).isContentEditable
        ) {
          return
        }

        // Only block plain Enter (allow Shift/Ctrl/Alt/Meta combos)
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

    //todo 参考Navicat Premium
    provide(contextKey, context)

    onBeforeUnmount(() => {
      window.removeEventListener('keydown', handleEnter)
    })



    return () => <div ref={rootRef}>{slots.default?.()}</div>
  }
})
