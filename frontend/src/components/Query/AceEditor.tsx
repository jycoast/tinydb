import {defineComponent, onMounted, onBeforeUnmount, PropType, ref, toRefs, nextTick, unref} from 'vue'
import queryParserWorkerFallback from './queryParserWorkerFallback'
import type {Editor as AceEditorType} from './aceApi'
import {createContextMenu} from '/@/components/Modals/createContextMenu'
import * as ace from 'ace-builds/src-noconflict/ace'
import 'ace-builds/src-noconflict/mode-sql'
import 'ace-builds/src-noconflict/mode-mysql'
import 'ace-builds/src-noconflict/mode-pgsql'
import 'ace-builds/src-noconflict/mode-sqlserver'
import 'ace-builds/src-noconflict/mode-json'
import 'ace-builds/src-noconflict/mode-javascript'
import 'ace-builds/src-noconflict/mode-yaml'
import 'ace-builds/src-noconflict/mode-markdown'
import 'ace-builds/src-noconflict/ext-searchbox'
import 'ace-builds/src-noconflict/ext-language_tools'
import 'ace-builds/src-noconflict/theme-chrome'
import 'ace-builds/src-noconflict/theme-dracula'
import 'ace-builds/src-noconflict/theme-monokai'
import 'ace-builds/src-noconflict/theme-github'
import 'ace-builds/src-noconflict/theme-tomorrow'
import 'ace-builds/src-noconflict/theme-tomorrow_night'
import 'ace-builds/src-noconflict/theme-sqlserver'
import 'ace-builds/src-noconflict/theme-solarized_dark'
import 'ace-builds/src-noconflict/theme-solarized_light'
import { SplitResultItem } from '/@/lib/tinydb-splitter/splitQuery';

interface IPart {
  start: {line: string; column: number; position: number}
  end: {line: string; column: number; position: number}
  trimStart: {line: string}
  text: string
}

export default defineComponent({
  name: "AceEditor",
  emits: ['init', 'focus', 'input'],
  props: {
    value: {
      type: String as PropType<string>,
      default: ''
    },
    mode: {
      type: String as PropType<string>,
      default: 'text'
    },
    options: {
      type: Object as PropType<Record<string, any>>,
      default: () => ({})
    },
    menu: {
      type: Array as unknown as PropType<[]>,
    },
    readOnly: {
      type: Boolean as PropType<boolean>,
      default: false
    },
    splitterOptions: {
      type: [Array, Object] as unknown as PropType<[] | object>,
    },
    currentPart: {
      type: Object as PropType<IPart>,
    }
  },
  setup(props, {emit}) {
    const EDITOR_ID = `ace-editor-${Math.floor(Math.random() * 10000000000)}`
    const {value, mode, readOnly, splitterOptions, currentPart, options, menu} = toRefs(props)
    const editor = ref<Nullable<AceEditorType>>()
    const containerRef = ref<HTMLElement | null>(null)
    const contentBackup = ref('')
    const queryParts = ref<IPart[]>([])
    const queryParserWorker = ref<Nullable<{text: string; options: {returnRichInfo: boolean}} | string>>(null)
    const resizeObserver = ref<ResizeObserver | null>(null)

    function getEditor(): AceEditorType {
      return editor.value;
    }

    function processParserResult(data: SplitResultItem[]) {
      queryParts.value = data
      changedCurrentQueryPart()
    }

    const handleContextMenu = (e: MouseEvent) => {
      const menuValue = unref(menu.value)
      if (!menuValue || !Array.isArray(menuValue) || menuValue.length === 0) return
      e.preventDefault()
      e.stopPropagation()
      createContextMenu({event: e, items: menuValue})
    }

    function changedQueryParts() {
      const ed = getEditor()
      if (splitterOptions.value && ed && queryParserWorker.value) {
        const message = {
          text: ed.getValue(),
          options: {...splitterOptions, returnRichInfo: true},
        }
        if (queryParserWorker.value === 'fallback') {
          processParserResult(queryParserWorkerFallback(message))
        } else {
          (queryParserWorker.value as unknown as Window).postMessage(message)
        }
      }
    }

    function changedCurrentQueryPart() {
      if (queryParts.value.length <= 1) return

      const selectionRange = editor.value!.getSelectionRange()
      const cursor = selectionRange.start
      const part = queryParts.value.find(
        x =>
          ((cursor.row == x.start.line && cursor.column >= x.start.column) || cursor.row > x.start.line) &&
          ((cursor.row == x.end.line && cursor.column <= x.end.column) || cursor.row < x.end.line)
      )

      if (
        part?.text != currentPart.value?.text ||
        part?.start?.position != currentPart.value?.start?.position ||
        part?.end?.position != currentPart.value?.end?.position
      ) {
        // 当前查询片段变更
      }
    }

    function setEventCallBacks() {
      editor.value!.on('focus', () => emit('focus'))
      editor.value!.setReadOnly(readOnly.value)
      editor.value!.on('change', () => {
        const content = editor.value!.getValue()
        value.value = content
        emit('input', content)
        contentBackup.value = content
        changedQueryParts()
      })
    }

    function resizeEditor() {
      if (editor.value && containerRef.value) {
        const rect = containerRef.value.getBoundingClientRect()
        if (rect.width > 0 && rect.height > 0) {
          editor.value.resize()
        }
      }
    }

    let initAttempts = 0
    const MAX_INIT_ATTEMPTS = 100
    let isInitialized = false

    function initEditor() {
      if (isInitialized) return
      initAttempts++
      if (initAttempts > MAX_INIT_ATTEMPTS) {
        console.error('AceEditor 初始化失败：超过最大尝试次数')
        return
      }

      if (!containerRef.value) {
        setTimeout(initEditor, 100)
        return
      }

      const computedStyle = window.getComputedStyle(containerRef.value)
      if (computedStyle.display === 'none') {
        setTimeout(initEditor, 100)
        return
      }

      try {
        editor.value = ace.edit(EDITOR_ID)
        isInitialized = true
        emit('init', editor.value)
      } catch (error) {
        console.error('AceEditor 初始化失败:', error)
        setTimeout(initEditor, 100)
        return
      }

      editor.value.$blockScrolling = Infinity
      editor.value.getSession().setMode('ace/mode/' + mode.value)
      editor.value.setValue(value.value, 1)
      editor.value.setHighlightActiveLine(false)
      contentBackup.value = value.value
      setEventCallBacks()
      if (options.value) {
        editor.value.setOptions({showPrintMargin: false, ...options.value})
      }

      editor.value.container.addEventListener('contextmenu', handleContextMenu)
      changedQueryParts()

      setTimeout(() => {
        resizeEditor()
        if (containerRef.value) {
          const rect = containerRef.value.getBoundingClientRect()
          if (rect.width === 0 || rect.height === 0) {
            setTimeout(resizeEditor, 200)
          }
        }
      }, 100)

      resizeObserver.value = new ResizeObserver(() => resizeEditor())
      if (containerRef.value) {
        resizeObserver.value.observe(containerRef.value)
      }

      const handleWindowResize = () => resizeEditor()
      window.addEventListener('resize', handleWindowResize)
      onBeforeUnmount(() => window.removeEventListener('resize', handleWindowResize))
    }

    onMounted(() => {
      nextTick(() => {
        initEditor()
        const observer = new MutationObserver(() => {
          if (!editor.value && containerRef.value) {
            const rect = containerRef.value.getBoundingClientRect()
            if (rect.width > 0 && rect.height > 0) initEditor()
          }
        })
        if (containerRef.value) {
          observer.observe(containerRef.value, {
            attributes: true,
            attributeFilter: ['style', 'class'],
            childList: true,
            subtree: true
          })
        }
        onBeforeUnmount(() => observer.disconnect())
      })
    })

    onBeforeUnmount(() => {
      if (resizeObserver.value) {
        resizeObserver.value.disconnect()
        resizeObserver.value = null
      }
      if (editor.value) {
        editor.value.container.removeEventListener('contextmenu', handleContextMenu)
        editor.value.destroy()
        editor.value.container.remove()
      }
    })

    const editorStyle = {
      position: 'absolute',
      left: 0, top: 0, right: 0, bottom: 0,
      width: '100%', height: '100%',
      minWidth: '100px', minHeight: '100px'
    }

    return () => (
      <div ref={containerRef} style={editorStyle}>
        <div id={EDITOR_ID} style={editorStyle}></div>
      </div>
    )
  }
})
