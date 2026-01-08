import {defineComponent, onMounted, onBeforeUnmount, PropType, ref, toRefs, nextTick} from 'vue'
import {useBootstrapStore} from "/@/store/modules/bootstrap";
import queryParserWorkerFallback from './queryParserWorkerFallback'
import * as ace from 'ace-builds/src-noconflict/ace'
import 'ace-builds/src-noconflict/mode-sql';
import 'ace-builds/src-noconflict/mode-mysql';
import 'ace-builds/src-noconflict/mode-pgsql';
import 'ace-builds/src-noconflict/mode-sqlserver';
import 'ace-builds/src-noconflict/mode-json';
import 'ace-builds/src-noconflict/mode-javascript';
import 'ace-builds/src-noconflict/mode-yaml';
import 'ace-builds/src-noconflict/mode-markdown';
import 'ace-builds/src-noconflict/ext-searchbox';
import 'ace-builds/src-noconflict/ext-language_tools';
import 'ace-builds/src-noconflict/theme-ambiance';
import 'ace-builds/src-noconflict/theme-chaos';
import 'ace-builds/src-noconflict/theme-chrome';
import 'ace-builds/src-noconflict/theme-clouds';
import 'ace-builds/src-noconflict/theme-clouds_midnight';
import 'ace-builds/src-noconflict/theme-cobalt';
import 'ace-builds/src-noconflict/theme-crimson_editor';
import 'ace-builds/src-noconflict/theme-dawn';
import 'ace-builds/src-noconflict/theme-dracula';
import 'ace-builds/src-noconflict/theme-dreamweaver';
import 'ace-builds/src-noconflict/theme-eclipse';
import 'ace-builds/src-noconflict/theme-github';
import 'ace-builds/src-noconflict/theme-gob';
import 'ace-builds/src-noconflict/theme-gruvbox';
import 'ace-builds/src-noconflict/theme-idle_fingers';
import 'ace-builds/src-noconflict/theme-iplastic';
import 'ace-builds/src-noconflict/theme-katzenmilch';
import 'ace-builds/src-noconflict/theme-kr_theme';
import 'ace-builds/src-noconflict/theme-kuroir';
import 'ace-builds/src-noconflict/theme-merbivore';
import 'ace-builds/src-noconflict/theme-merbivore_soft';
import 'ace-builds/src-noconflict/theme-mono_industrial';
import 'ace-builds/src-noconflict/theme-monokai';
import 'ace-builds/src-noconflict/theme-nord_dark';
import 'ace-builds/src-noconflict/theme-pastel_on_dark';
import 'ace-builds/src-noconflict/theme-solarized_dark';
import 'ace-builds/src-noconflict/theme-solarized_light';
import 'ace-builds/src-noconflict/theme-sqlserver';
import 'ace-builds/src-noconflict/theme-terminal';
import 'ace-builds/src-noconflict/theme-textmate';
import 'ace-builds/src-noconflict/theme-tomorrow';
import 'ace-builds/src-noconflict/theme-tomorrow_night_blue';
import 'ace-builds/src-noconflict/theme-tomorrow_night_bright';
import 'ace-builds/src-noconflict/theme-tomorrow_night_eighties';
import 'ace-builds/src-noconflict/theme-tomorrow_night';
import 'ace-builds/src-noconflict/theme-twilight';

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
      type: Object as PropType<{}>,
      default: {}
    },
    menu: {
      type: Array as unknown as PropType<[]>,
    },
    readOnly: {
      type: Boolean as PropType<Boolean>,
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

    const bootstrap = useBootstrapStore()

    const EDITOR_ID = `svelte-ace-editor-div:${Math.floor(Math.random() * 10000000000)}`
    const {value, mode, readOnly, splitterOptions, currentPart, options, menu} = toRefs(props)
    const editor = ref<Nullable<ace.Editor>>()
    const containerRef = ref<HTMLElement | null>(null)
    const contentBackup = ref<string>('')
    const queryParts = ref<IPart[]>([])
    const queryParserWorker = ref<Nullable<{
      text: string;
      options: {returnRichInfo: boolean};
    } | string>>(null)
    const resizeObserver = ref<ResizeObserver | null>(null)

    const stdOptions = {
      showPrintMargin: false,
    }

    function getEditor(): ace.Editor {
      return editor.value
    }

    function processParserResult(data: []) {
      queryParts.value = data
      // editor.setHighlightActiveLine(queryParts.length <= 1);
      changedCurrentQueryPart();
      updateAnnotations();
    }

    function updateAnnotations() {}

    const handleContextMenu = e => {
      e.preventDefault()
      const left = e.pageX
      const top = e.pageY
      bootstrap.setCurrentDropDownMenu({ left, top, items: menu.value!, targetElement: e.target })
    }

    // NOTE:
    // Do not register a custom keyboard handler unless we actually implement it.
    // An empty handler can break core editor commands (eg. Enter/newline) depending on Ace internals.

    function changedQueryParts() {
      const editor = getEditor()
      if (splitterOptions.value && editor && queryParserWorker.value) {
        const message = {
          text: editor.getValue(),
          options: {
            ...splitterOptions,
            returnRichInfo: true,
          },
        }

        if (queryParserWorker.value == 'fallback') {
          const res = queryParserWorkerFallback(message);
          processParserResult(res);
        } else {
          (queryParserWorker.value as unknown as Window).postMessage(message)
        }
      }
    }

    function changedCurrentQueryPart() {
      if (queryParts.value.length <= 1) {

      }

      const selectionRange = editor.value.getSelectionRange();

      // if (
      //   selectionRange.start.row != selectionRange.end.row ||
      //   selectionRange.start.column != selectionRange.end.column
      // ) {
      //   removeCurrentPartMarker();
      //   currentPart = null;
      //   return;
      // }

      const cursor = selectionRange.start;
      const part = queryParts.value.find(
        x =>
          ((cursor.row == x.start.line && cursor.column >= x.start.column) || cursor.row > x.start.line) &&
          ((cursor.row == x.end.line && cursor.column <= x.end.column) || cursor.row < x.end.line)
      );

      if (
        part?.text != currentPart.value?.text ||
        part?.start?.position != currentPart.value?.start?.position ||
        part?.end?.position != currentPart.value?.end?.position
      ) {
        removeCurrentPartMarker()
      }
    }




      function setEventCallBacks() {
        editor.value.on('focus', () => emit('focus'))

        editor.value.setReadOnly(readOnly.value)
        editor.value.on('change', () => {
          const content = editor.value.getValue()
          value.value = content
          emit('input', content)
          contentBackup.value = content
          changedQueryParts()
        })
      }

      function removeCurrentPartMarker() {

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
      const MAX_INIT_ATTEMPTS = 100 // 最多尝试10秒（100 * 100ms）
      let isInitialized = false

      function initEditor() {
        if (isInitialized) return
        
        initAttempts++
        if (initAttempts > MAX_INIT_ATTEMPTS) {
          console.error('Failed to initialize AceEditor after maximum attempts')
          return
        }

        if (!containerRef.value) {
          // 如果容器还没有准备好，延迟初始化
          setTimeout(initEditor, 100)
          return
        }
        
        const rect = containerRef.value.getBoundingClientRect()
        const computedStyle = window.getComputedStyle(containerRef.value)
        const isDisplayed = computedStyle.display !== 'none'
        const isVisibleStyle = computedStyle.visibility !== 'hidden'
        
        // 如果容器不可见，延迟初始化（但允许初始化，因为 visibility: hidden 时 offsetParent 可能为 null）
        if (!isDisplayed || (isVisibleStyle === false && rect.width === 0 && rect.height === 0)) {
          setTimeout(initEditor, 100)
          return
        }

        // 容器准备好了，初始化编辑器（即使尺寸为0也可以初始化，后续会resize）
        try {
          editor.value = ace.edit(EDITOR_ID)
          isInitialized = true
          emit('init', editor.value)
        } catch (error) {
          console.error('Failed to initialize AceEditor:', error)
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
          editor.value.setOptions({
            ...stdOptions,
            ...options.value
          })
        }

        editor.value.container.addEventListener('contextmenu', handleContextMenu)
        changedQueryParts()

        // 初始化时调整大小（延迟一下确保编辑器完全初始化）
        setTimeout(() => {
          resizeEditor()
          // 如果容器尺寸为0，继续尝试
          if (containerRef.value) {
            const rect = containerRef.value.getBoundingClientRect()
            if (rect.width === 0 || rect.height === 0) {
              // 延迟再次尝试 resize
              setTimeout(() => resizeEditor(), 200)
            }
          }
        }, 100)

        // 监听窗口大小变化
        resizeObserver.value = new ResizeObserver(() => {
          resizeEditor()
        })
        if (containerRef.value) {
          resizeObserver.value.observe(containerRef.value)
        }
        
        // 也监听窗口 resize 事件
        const handleWindowResize = () => {
          resizeEditor()
        }
        window.addEventListener('resize', handleWindowResize)
        
        // 清理函数
        onBeforeUnmount(() => {
          window.removeEventListener('resize', handleWindowResize)
        })

        editor.value.on('guttermousedown', e => {
          const row = e.getDocumentPosition().row
          const part = (queryParts.value || []).find(part => part.trimStart.line == row)
          // if (part && onExecuteFragment) {
          //   onExecuteFragment(part.text, part.trimStart.line);
          //   e.stop();
          //   editor.value.moveCursorTo(part.trimStart.line, 0);
          //   editor.value.selection.clearSelection();
          // }
        },
          true
        )
      }

      onMounted(() => {
        // 使用多种方式确保容器准备好
        nextTick(() => {
          // 立即尝试一次
          initEditor()
          
          // 也监听 DOM 变化
          const observer = new MutationObserver(() => {
            if (!editor.value && containerRef.value) {
              const rect = containerRef.value.getBoundingClientRect()
              if (rect.width > 0 && rect.height > 0) {
                initEditor()
              }
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
          
          // 清理 observer
          onBeforeUnmount(() => {
            observer.disconnect()
          })
        })
      })

    onBeforeUnmount(() => {
      if (resizeObserver.value) {
        resizeObserver.value.disconnect()
        resizeObserver.value = null
      }
      if (editor.value) {
        editor.value.container.removeEventListener('contextmenu', handleContextMenu);
        editor.value.destroy();
        editor.value.container.remove();
      }
    })

      return () => (
        <div 
          ref={containerRef}
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            right: 0,
            bottom: 0,
            width: '100%',
            height: '100%',
            minWidth: '100px',
            minHeight: '100px'
          }}
        >
          <div 
            id={EDITOR_ID}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              width: '100%',
              height: '100%',
              minWidth: '100px',
              minHeight: '100px'
            }}
          ></div>
        </div>
      )
    }
  })

export const EDITOR_THEMES = [
  'ambiance',
  'chaos',
  'chrome',
  'clouds',
  'clouds_midnight',
  'cobalt',
  'crimson_editor',
  'dawn',
  'dracula',
  'dreamweaver',
  'eclipse',
  'github',
  'gob',
  'gruvbox',
  'idle_fingers',
  'iplastic',
  'katzenmilch',
  'kr_theme',
  'kuroir',
  'merbivore',
  'merbivore_soft',
  'mono_industrial',
  'monokai',
  'nord_dark',
  'pastel_on_dark',
  'solarized_dark',
  'solarized_light',
  'sqlserver',
  'terminal',
  'textmate',
  'tomorrow',
  'tomorrow_night_blue',
  'tomorrow_night_bright',
  'tomorrow_night_eighties',
  'tomorrow_night',
  'twilight',
];

export const FONT_SIZES = [
  {label: '8', value: '8'},
  {label: '9', value: '9'},
  {label: '10', value: '10'},
  {label: '11', value: '11'},
  {label: '12 - Normal', value: '12'},
  {label: '13', value: '13'},
  {label: '14', value: '14'},
  {label: '15', value: '15'},
  {label: '16', value: '16'},
  {label: '17', value: '17'},
  {label: 'Custom', value: 'custom'},
];
