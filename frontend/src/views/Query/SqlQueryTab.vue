<template>
  <div style="display: flex; flex-direction: column; height: 100%; width: 100%;">
    <!-- 顶部工具栏 -->
    <div
      style="flex: 0 0 auto; padding: 8px 16px; display: flex; flex-direction: column; gap: 8px; border-bottom: 1px solid var(--theme-border);">

      <div style="display: flex; align-items: center; gap: 8px; overflow: hidden;">
        <el-select
          v-model="selectedConid"
          style="flex: 0 1 auto; width: 180px; max-width: 180px; min-width: 150px;"
          size="small"
          filterable
          clearable
          placeholder="选择数据源"
          @change="handleChangeConid"
        >
          <el-option
            v-for="opt in connectionOptions"
            :key="opt.value"
            :label="opt.label"
            :value="opt.value"
          />
        </el-select>
        <el-select
          v-model="selectedObject"
          style="flex: 0 1 auto; width: 180px; max-width: 180px; min-width: 150px;"
          size="small"
          filterable
          clearable
          placeholder="选择库/表"
          @change="handleSelectObject"
        >
          <el-option-group v-if="databaseOptions.length" label="Databases">
            <el-option
              v-for="db in databaseOptions"
              :key="`db:${db}`"
              :label="db"
              :value="`db:${db}`"
            />
          </el-option-group>

          <el-option-group v-if="tableOptions.length" label="Tables">
            <el-option
              v-for="t in tableOptions"
              :key="`table:${t}`"
              :label="t"
              :value="`table:${t}`"
            />
          </el-option-group>
        </el-select>

        <el-button type="primary" :icon="VideoPlay" :loading="executing" @click="handleExecute" style="flex-shrink: 0;">
          执行
        </el-button>
        <el-button :icon="Delete" @click="handleClear" style="flex-shrink: 0;">清空</el-button>
      </div>

    </div>

    <!-- 编辑区：Ace Editor -->
    <div style="flex: 1; min-height: 0; position: relative;">
      <AceEditor
        :value="sqlContent"
        mode="mysql"
        :options="editorOptions"
        :menu="contextMenuItems as any"
        @init="handleEditorInit"
        @input="handleSqlInput"
      />
    </div>

    <!-- 结果区 -->
    <div v-if="showResults"
         style="flex: 0 0 38%; min-height: 200px; max-height: 50%; display: flex; flex-direction: column; border-top: 1px solid var(--theme-border);">
      <el-card
        shadow="never"
        style="flex: 1; display: flex; flex-direction: column; overflow: hidden;"
        :body-style="{ padding: 0, flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }"
      >
        <template #header>
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div>
              <span>查询结果</span>
              <span v-if="resultsInfo" style="font-size: 12px; color: #909399; margin-left: 8px;">
                {{ resultsInfo }}
              </span>
            </div>
            <el-space>
              <el-button size="small" :icon="DocumentCopy" @click="handleCopyResults">
                复制 (Ctrl+C)
              </el-button>
              <el-button size="small" @click="clearResultSelection">清除选择</el-button>
            </el-space>
          </div>
        </template>
        <div
          ref="resultsHotkeyHost"
          tabindex="0"
          style="flex: 1; overflow: auto; padding: 12px; outline: none;"
          @mousedown="focusResultsHotkeyHost"
          @keydown="handleResultsKeyDown"
        >
          <el-alert
            v-if="error"
            type="error"
            title="执行失败"
            :closable="true"
            @close="error = ''"
            show-icon
          >
            <template #default>
              <pre class="sql-error-pre">{{ error }}</pre>
            </template>
          </el-alert>

          <el-table
            v-else-if="queryResult && resultTableData.length > 0"
            :data="resultTableData"
            :row-key="(row: any) => row.key"
            :max-height="resultsScrollY"
            size="default"
            border
            v-loading="executing"
            @row-click="handleTableRowClick"
            @selection-change="handleSelectionChange"
            style="width: 100%"
          >
            <el-table-column type="selection" width="55" />
            <el-table-column
              v-for="col in tableColumns"
              :key="col.key"
              :prop="col.dataIndex"
              :label="col.title"
              :width="col.width"
              :show-overflow-tooltip="col.ellipsis"
            >
              <template #default="{ row, column }">
                <div
                  @click="handleCellClick(row, column.property)"
                  @dblclick="startEditResultCell(row.key, column.property)"
                >
                  <el-input
                    v-if="isEditingCell(row.key, column.property)"
                    v-model="editingResultValue"
                    size="small"
                    autofocus
                    @blur="commitEditResultCell(row.key, column.property)"
                    @keyup.enter="commitEditResultCell(row.key, column.property)"
                    @click.stop
                  />
                  <span v-else>{{ row[column.property] }}</span>
                </div>
              </template>
            </el-table-column>
            <template #empty>
              <el-empty description="查询成功，但没有返回数据" />
            </template>
          </el-table>

          <el-empty
            v-else-if="queryResult && resultTableData.length === 0"
            description="查询成功，但没有返回数据"
          />
        </div>
      </el-card>
    </div>
  </div>
</template>

<script lang="ts">
// 给 openNewTab 用：用于判断是否复用已有 tab
export const matchingProps = ['conid', 'database']
export const allowAddToFavorites = (_: any) => true
</script>

<script lang="ts" setup>
import {computed, nextTick, onBeforeUnmount, onMounted, PropType, ref, watch} from 'vue'
import {storeToRefs} from 'pinia'
import {useBootstrapStore} from '/@/store/modules/bootstrap'
import {debounce} from 'lodash-es'
import { ElMessage } from 'element-plus'
import {
  Delete,
  VideoPlay,
  DocumentCopy
} from '@element-plus/icons-vue'
import type {ContextMenuItem} from '/@/components/Modals/typing'
import {databaseConnectionsSqlSelectApi} from '/@/api/simpleApis'
import {getConnectionInfo, useDatabaseInfo} from '/@/api/bridge'
import AceEditor from '/@/components/Query/AceEditor'
import { ace, type Editor as AceEditorType, type IEditSession, type Position } from '/@/components/Query/aceApi'
import 'ace-builds/src-noconflict/ext-language_tools'
import type {DatabaseInfo, TableInfo, ColumnInfo} from '/@/lib/tinydb-types'
import {useClusterApiStore} from '/@/store/modules/clusterApi'
import {copyRowsToClipboard} from '/@/utils/tinydb/clipboard'
import {saveQueryHistory} from '/@/utils/queryHistory'

const props = defineProps({
  tabid: {type: String as PropType<string>, required: true},
  conid: {type: String as PropType<string>},
  database: {type: String as PropType<string>},
  tabVisible: {type: Boolean as PropType<boolean>, default: true},
  // If true, don't auto-select currentDatabase; user must pick connection/db manually
  noPrefill: {type: Boolean as PropType<boolean>, default: false},
})

const bootstrap = useBootstrapStore()
const {currentDatabase} = storeToRefs(bootstrap)
const clusterApi = useClusterApiStore()
const {connectionList} = storeToRefs(clusterApi)

const editor = ref<Nullable<AceEditorType>>(null)
const sqlContent = ref('')
const executing = ref(false)
const showResults = ref(false)
const error = ref('')
type SqlQueryResult = { rows: any[]; columns: Array<{ columnName: string }> }
const queryResult = ref<SqlQueryResult | null>(null)
const resultTableData = ref<any[]>([])
const resultSelectedRowKeys = ref<Array<string | number>>([])
const activeResultCell = ref<{ rowKey: string | number; dataIndex: string } | null>(null)
const editingResultCell = ref<{ rowKey: string | number; dataIndex: string } | null>(null)
const editingResultValue = ref<string>('')
const resultsHotkeyHost = ref<HTMLElement | null>(null)
const connectionName = ref('')
const resultsScrollY = ref<number>(260)
const databaseStructure = ref<DatabaseInfo | null>(null)

// 编辑器配置
const editorOptions = {
  fontSize: 14,
  tabSize: 2,
  useSoftTabs: true,
  wrap: false,
  showLineNumbers: true,
  enableBasicAutocompletion: true,
  enableLiveAutocompletion: true,
  enableSnippets: true,
  showPrintMargin: false,
}

// NOTE: props.database may be fixed at tab creation; after we add the DB dropdown,
// we must use the user's selected database for execution instead of the original props.
const currentConid = computed(() => (props.noPrefill ? undefined : (props.conid || currentDatabase.value?.connection?._id)))
const currentDatabaseName = computed(() => (props.noPrefill ? undefined : (props.database || currentDatabase.value?.name)))

const selectedConid = ref<string | undefined>(props.noPrefill ? undefined : (currentConid.value || undefined))
const selectedDatabase = ref<string | undefined>(props.noPrefill ? undefined : (props.database || currentDatabaseName.value || undefined))
const selectedObject = ref<string | undefined>(undefined)

const effectiveConid = computed(() => selectedConid.value || currentConid.value)
const effectiveDatabaseName = computed(() => selectedDatabase.value || currentDatabaseName.value)

const connectionOptions = computed(() => {
  const list = connectionList.value || []
  return list
    .filter((c: any) => c && c._id)
    .map((c: any) => ({
      value: c._id,
      label: c.displayName || c.name || c.host || c.server || c._id,
    }))
})

const databaseOptions = computed<string[]>(() => {
  const conid = selectedConid.value
  if (!conid) return []
  try {
    const arr: any[] = JSON.parse(localStorage.getItem(`database_list_${conid}`) || '[]')
    return (Array.isArray(arr) ? arr : []).map((x: any) => x?.name).filter(Boolean)
  } catch {
    return []
  }
})

const tableOptions = computed<string[]>(() => {
  const tables: any[] = (databaseStructure.value as any)?.tables || []
  return (Array.isArray(tables) ? tables : []).map((t: any) => t?.pureName).filter(Boolean)
})

// keep connection label in sync with the selected connection
watch(
  () => effectiveConid.value,
  () => {
    void refreshConnectionLabel()
  },
  {immediate: true}
)

// Element Plus select 的 filterable 会自动处理，不需要手动过滤函数

function normalizeValueToken(raw: string): string {
  let s = (raw || '').trim()
  if (!s) return ''
  // drop trailing comma from copied lists
  s = s.replace(/,+$/g, '').trim()
  // strip surrounding quotes/backticks
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'")) || (s.startsWith('`') && s.endsWith('`'))) {
    s = s.slice(1, -1)
  }
  return s.trim()
}

function toInListText(selectedText: string): string {
  const raw = (selectedText || '').replace(/\r\n/g, '\n').trim()
  if (!raw) return ''
  let parts = raw.split('\n').map((x) => x.trim()).filter(Boolean)
  // If user selected a single line like "1 2 3" or "1,2,3", split further.
  if (parts.length === 1) {
    parts = parts[0].split(/[\s,]+/g).map((x) => x.trim()).filter(Boolean)
  }
  const cleaned = parts.map(normalizeValueToken).filter(Boolean)
  return cleaned.map((v) => `"${v.replace(/"/g, '\\"')}"`).join(',')
}

function handleConvertSelectionToInList() {
  const ed = editor.value
  if (!ed) {
    ElMessage.warning('编辑器未就绪')
    return
  }
  const sel = (ed.getSelectedText?.() as string) || ''
  if (!sel || !sel.trim()) {
    ElMessage.info('请先选中要转换的内容（每行一个值）')
    return
  }
  const converted = toInListText(sel)
  if (!converted) {
    ElMessage.info('选中内容为空，无法转换')
    return
  }
  // Replace current selection
  // @ts-ignore
  const range = ed.getSelectionRange()
  ed.session.replace(range, converted)
  ed.clearSelection()
  ed.focus()
}

async function handleFormatSql() {
  const ed = editor.value
  if (!ed) {
    ElMessage.warning('编辑器未就绪')
    return
  }

  const selectedText = (ed.getSelectedText?.() as string) || ''
  const source = selectedText && selectedText.trim() ? selectedText : ed.getValue()
  if (!source || !source.trim()) {
    ElMessage.info('没有可美化的 SQL')
    return
  }

  // 检查文件大小，如果太大则提示用户
  const lineCount = source.split('\n').length
  const LARGE_FILE_THRESHOLD = 100000 // 10万行
  if (lineCount > LARGE_FILE_THRESHOLD) {
    const confirmed = await new Promise<boolean>((resolve) => {
      const loadingInstance = ElMessage({
        message: `文件较大（${lineCount.toLocaleString()} 行），格式化可能需要较长时间，是否继续？`,
        type: 'info',
        duration: 0,
      })
      // 自动确认，但显示提示
      setTimeout(() => {
        loadingInstance.close()
        resolve(true)
      }, 2000)
    })
    if (!confirmed) return
  }

  let loadingInstance: any = null
  const showLoading = (text: string) => {
    if (loadingInstance) {
      loadingInstance.close()
    }
    loadingInstance = ElMessage({
      message: text,
      type: 'info',
      duration: 0,
    })
  }

  showLoading(lineCount > 10000 ? `正在格式化 SQL（${lineCount.toLocaleString()} 行）...` : '正在格式化 SQL...')

  try {
    // Lazy-load to keep initial bundle small
    const mod: any = await import('sql-formatter')
    const formatFn = mod?.format || mod?.default?.format
    if (typeof formatFn !== 'function') {
      if (loadingInstance) loadingInstance.close()
      ElMessage.error('SQL 格式化模块加载失败')
      return
    }

    let formatted: string

    // 对于超大文件，使用分批处理避免阻塞主线程
    const CHUNK_SIZE = 10000 // 每次处理1万行
    const formatOptions = {
      language: 'mysql',
      keywordCase: 'upper',
      linesBetweenQueries: 1,
      tabWidth: 2,
    }

    formatted = await formatLargeFile(source, formatFn, CHUNK_SIZE, formatOptions, (progress) => {
      showLoading(`正在格式化 SQL... ${progress}%`)
    })

    if (loadingInstance) loadingInstance.close()

    if (selectedText && selectedText.trim()) {
      // @ts-ignore
      const range = ed.getSelectionRange()
      ed.session.replace(range, formatted)
      ed.clearSelection()
      ed.focus()
      ElMessage.success('SQL 格式化完成')
      return
    }

    const pos = ed.getCursorPosition()
    ed.setValue(formatted, -1)
    // Best-effort: restore cursor
    try {
      const newLineCount = ed.session.getLength()
      const row = Math.min(Math.max(0, pos.row), Math.max(0, newLineCount - 1))
      const line = ed.session.getLine(row) || ''
      const col = Math.min(Math.max(0, pos.column), line.length)
      ed.moveCursorTo(row, col)
    } catch {
      // ignore
    }
    ed.focus()
    ElMessage.success('SQL 格式化完成')
  } catch (e: any) {
    if (loadingInstance) loadingInstance.close()
    ElMessage.error(`SQL 美化失败：${e?.message || e}`)
  }
}

// 分批处理大文件，避免阻塞主线程
async function formatLargeFile(
  source: string,
  formatFn: (sql: string, options: any) => string,
  chunkSize: number,
  formatOptions: any,
  onProgress?: (progress: number) => void
): Promise<string> {
  const lines = source.split('\n')
  const totalLines = lines.length
  const chunks: string[] = []

  // 按 SQL 语句分割，而不是简单按行分割
  // 这样可以避免在 SQL 语句中间分割
  const sqlStatements = splitSqlStatements(source)

  if (sqlStatements.length === 1) {
    // 如果只有一个大的 SQL 语句，按行分割处理
    for (let i = 0; i < lines.length; i += chunkSize) {
      const chunk = lines.slice(i, i + chunkSize).join('\n')
      const formatted = formatFn(chunk, formatOptions)
      chunks.push(formatted)

      if (onProgress) {
        const progress = Math.min(100, Math.round(((i + chunkSize) / totalLines) * 100))
        onProgress(progress)
      }

      // 让出控制权，避免阻塞主线程
      // 使用 requestIdleCallback 如果可用，否则使用 setTimeout
      if (typeof requestIdleCallback !== 'undefined') {
        await new Promise(resolve => requestIdleCallback(() => resolve(undefined), {timeout: 100}))
      } else {
        await new Promise(resolve => setTimeout(resolve, 10))
      }
    }
  } else {
    // 按 SQL 语句处理，每处理一批后让出控制权
    const BATCH_SIZE = 50 // 每批处理50个语句
    for (let i = 0; i < sqlStatements.length; i += BATCH_SIZE) {
      const batch = sqlStatements.slice(i, i + BATCH_SIZE)
      for (const statement of batch) {
        const formatted = formatFn(statement, formatOptions)
        chunks.push(formatted)
      }

      if (onProgress) {
        const progress = Math.min(100, Math.round(((i + BATCH_SIZE) / sqlStatements.length) * 100))
        onProgress(progress)
      }

      // 让出控制权
      if (typeof requestIdleCallback !== 'undefined') {
        await new Promise(resolve => requestIdleCallback(() => resolve(undefined), {timeout: 100}))
      } else {
        await new Promise(resolve => setTimeout(resolve, 10))
      }
    }
  }

  return sqlStatements.length === 1 ? chunks.join('\n') : chunks.join('\n\n')
}

// 简单的 SQL 语句分割（按分号分割，但保留字符串中的分号）
function splitSqlStatements(sql: string): string[] {
  const statements: string[] = []
  let current = ''
  let inString = false
  let stringChar = ''

  for (let i = 0; i < sql.length; i++) {
    const char = sql[i]
    const prevChar = i > 0 ? sql[i - 1] : ''

    // 检测字符串开始/结束
    if ((char === '"' || char === "'" || char === '`') && prevChar !== '\\') {
      if (!inString) {
        inString = true
        stringChar = char
      } else if (char === stringChar) {
        inString = false
        stringChar = ''
      }
    }

    current += char

    // 如果不在字符串中，遇到分号则分割
    if (!inString && char === ';') {
      const trimmed = current.trim()
      if (trimmed) {
        statements.push(trimmed)
      }
      current = ''
    }
  }

  // 添加最后一部分
  const trimmed = current.trim()
  if (trimmed) {
    statements.push(trimmed)
  }

  return statements.length > 0 ? statements : [sql]
}

function handleDeduplicateSelection() {
  const ed = editor.value
  if (!ed) {
    ElMessage.warning('编辑器未就绪')
    return
  }

  const selectedText = (ed.getSelectedText?.() as string) || ''
  if (!selectedText || !selectedText.trim()) {
    ElMessage.info('请先选中要去重的内容（每行一个值）')
    return
  }

  // 按行分割
  const lines = selectedText.split(/\r?\n/)

  // 使用 Set 来跟踪已出现的行（保留第一次出现的行）
  const seen = new Set<string>()
  const uniqueLines: string[] = []

  for (const line of lines) {
    // 使用 trim() 后的内容作为去重的键，但保留原始行的格式
    const trimmed = line.trim()
    if (!seen.has(trimmed)) {
      seen.add(trimmed)
      uniqueLines.push(line)
    }
  }

  // 重新组合成文本
  const deduplicated = uniqueLines.join('\n')

  // 如果去重后没有变化，提示用户
  if (deduplicated === selectedText) {
    ElMessage.info('选中内容中没有重复的行')
    return
  }

  // 替换选中的内容
  // @ts-ignore
  const range = ed.getSelectionRange()
  ed.session.replace(range, deduplicated)
  ed.clearSelection()
  ed.focus()

  const removedCount = lines.length - uniqueLines.length
  ElMessage.success(`去重完成，已移除 ${removedCount} 行重复数据`)
}

// 右键菜单项（需要在函数定义之后）
const contextMenuItems = computed<ContextMenuItem[]>(() => [
  {
    label: '转 IN 列表',
    onClick: handleConvertSelectionToInList
  },
  {
    label: 'SQL 美化',
    onClick: handleFormatSql
  },
  {
    label: '去重',
    onClick: handleDeduplicateSelection
  }
])

async function handleChangeConid(conid?: string) {
  selectedConid.value = conid
  selectedObject.value = undefined
  selectedDatabase.value = undefined

  if (!conid) {
    ElMessage.warning('请选择数据源')
    return
  }

  try {
    const conn = await getConnectionInfo({conid})
    if (!conn) {
      ElMessage.error('无法获取连接信息')
      return
    }

    // Pick a reasonable default database:
    // - keep existing db if still present
    // - else use connection defaultDatabase
    // - else first from cached list
    const cachedDbs = databaseOptions.value
    const keep = currentDatabaseName.value && cachedDbs.includes(currentDatabaseName.value) ? currentDatabaseName.value : null
    const db =
      keep ||
      (conn as any).defaultDatabase ||
      cachedDbs[0] ||
      currentDatabaseName.value ||
      undefined

    bootstrap.setCurrentDatabase({
      connection: conn,
      name: db,
      title: db || (conn.displayName || conn.host || conn.server || 'Database'),
    } as any)

    // reflect selection in the second dropdown
    if (db) {
      selectedDatabase.value = db
      selectedObject.value = `db:${db}`
    }
  } catch (e: any) {
    ElMessage.error(`切换数据源失败：${e?.message || e}`)
  }
}

async function handleSelectObject(val: string) {
  if (!val) return
  const conid = effectiveConid.value
  if (!conid) {
    ElMessage.warning('请先选择数据源')
    return
  }

  if (val.startsWith('db:')) {
    const db = val.slice(3)
    selectedDatabase.value = db
    try {
      const conn = await getConnectionInfo({conid, database: db})
      if (!conn) {
        ElMessage.error('无法获取连接信息')
        return
      }
      bootstrap.setCurrentDatabase({
        connection: conn,
        name: db,
        title: db,
      } as any)
    } catch (e: any) {
      ElMessage.error(`切换数据库失败：${e?.message || e}`)
    }
    return
  }

  if (val.startsWith('table:')) {
    const table = val.slice(6)
    const tpl = `SELECT *
                 FROM \`${table}\` LIMIT 100;`
    // If it's still placeholder-ish, replace; otherwise just append
    const cur = (sqlContent.value || '').trim()
    if (!cur || cur.includes('SELECT * FROM table_name')) {
      sqlContent.value = tpl
    } else {
      sqlContent.value = `${cur}\n\n${tpl}`
    }
    focusEditor()
  }
}

function focusEditor() {
  nextTick(() => {
    editor.value?.focus()
  })
}

function recalcResultsScroll() {
  const h = window.innerHeight || 900
  resultsScrollY.value = Math.max(160, Math.min(520, Math.floor(h * 0.28)))
}

// 获取数据库结构
const databaseInfoStore = ref<DatabaseInfo | null>(null)
if (currentConid.value && currentDatabaseName.value) {
  useDatabaseInfo(
    {conid: currentConid.value, database: currentDatabaseName.value},
    databaseInfoStore
  )
}

watch(
  () => [effectiveConid.value, effectiveDatabaseName.value],
  ([conid, database]) => {
    if (conid && database) {
      databaseInfoStore.value = null
      useDatabaseInfo({conid, database}, databaseInfoStore)
    }
  },
  {immediate: true}
)

watch(
  () => currentConid.value,
  (v) => {
    if (v) selectedConid.value = v
  },
  {immediate: true}
)

watch(
  () => currentDatabaseName.value,
  (v) => {
    // If user didn't pick a DB explicitly, follow the current database
    if (!selectedDatabase.value && v) selectedDatabase.value = v
  },
  {immediate: true}
)

watch(databaseInfoStore, (newVal) => {
  databaseStructure.value = newVal
  // 更新自动补全
  if (editor.value) {
    setupAutocomplete(editor.value)
  }
})

async function refreshConnectionLabel() {
  const conid = effectiveConid.value
  if (!conid) return
  try {
    const conn = await getConnectionInfo({conid})
    connectionName.value = conn?.displayName || conn?.host || 'Unknown'
  } catch (e) {
    console.error('Failed to get connection info:', e)
  }
}

onMounted(async () => {
  recalcResultsScroll()
  window.addEventListener('resize', recalcResultsScroll)

  // 安全地读取 localStorage，处理可能的错误
  try {
    // 首先尝试从临时存储读取（从查询历史打开时）
    const tempTabId = (props as any)._tempTabId
    if (tempTabId) {
      const tempSql = localStorage.getItem(`sql_query_${tempTabId}`)
      if (tempSql) {
        sqlContent.value = tempSql
        // 清理临时存储
        localStorage.removeItem(`sql_query_${tempTabId}`)
        // 保存到当前 tabid
        localStorage.setItem(`sql_query_${props.tabid}`, tempSql)
      } else {
        const saved = localStorage.getItem(`sql_query_${props.tabid}`)
        sqlContent.value = saved ?? ''
      }
    } else {
      const saved = localStorage.getItem(`sql_query_${props.tabid}`)
      sqlContent.value = saved ?? ''
    }
  } catch (e) {
    console.warn('读取 SQL 内容失败，使用默认值:', e)
    sqlContent.value = ''
  }

  await refreshConnectionLabel()

  if (props.tabVisible) focusEditor()
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', recalcResultsScroll)
  // 取消防抖，确保最后一次保存能够执行
  debouncedSaveSql.flush()
})

watch(
  () => props.tabVisible,
  (v) => {
    if (v) focusEditor()
  },
  {immediate: true},
)

// 安全地保存到 localStorage，处理配额超出错误
function safeSetLocalStorage(key: string, value: string) {
  try {
    // 检查内容大小（localStorage 通常限制在 5-10MB）
    // 估算：每个字符约 2 字节（UTF-16），留出安全边际
    const MAX_SIZE = 2 * 1024 * 1024 // 2MB 安全限制
    const size = new Blob([value]).size

    if (size > MAX_SIZE) {
      // 内容太大，只保存前一部分（保留前 500KB）
      const MAX_SAVE_SIZE = 500 * 1024 // 500KB
      const truncated = value.slice(0, Math.floor(MAX_SAVE_SIZE / 2)) // 字符数约为字节数的一半
      localStorage.setItem(key, truncated)
      console.warn(`SQL 内容过大（${(size / 1024 / 1024).toFixed(2)}MB），已截断保存前 ${(MAX_SAVE_SIZE / 1024).toFixed(0)}KB`)
      return false
    }

    localStorage.setItem(key, value)
    return true
  } catch (e: any) {
    if (e?.name === 'QuotaExceededError' || e?.code === 22) {
      // 配额超出，尝试清理旧数据或截断保存
      console.warn('localStorage 配额超出，尝试清理旧数据')

      // 尝试清理其他 SQL 查询的缓存
      try {
        const keysToRemove: string[] = []
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i)
          if (key && key.startsWith('sql_query_') && key !== `sql_query_${props.tabid}`) {
            keysToRemove.push(key)
          }
        }
        // 删除最旧的一些键
        keysToRemove.slice(0, Math.min(5, keysToRemove.length)).forEach(k => localStorage.removeItem(k))

        // 再次尝试保存（如果还是太大，就截断）
        const MAX_SAVE_SIZE = 500 * 1024
        const truncated = value.slice(0, Math.floor(MAX_SAVE_SIZE / 2))
        localStorage.setItem(key, truncated)
        console.warn(`已清理旧缓存，当前 SQL 内容已截断保存`)
        return false
      } catch (e2) {
        console.error('无法保存 SQL 内容到 localStorage:', e2)
        return false
      }
    }
    console.error('保存 SQL 内容到 localStorage 失败:', e)
    return false
  }
}

// 使用防抖来减少保存频率，避免频繁写入
const debouncedSaveSql = debounce((tabid: string, content: string) => {
  safeSetLocalStorage(`sql_query_${tabid}`, content)
}, 1000) // 1秒防抖

watch(
  () => sqlContent.value,
  (val) => {
    debouncedSaveSql(props.tabid, val ?? '')
  },
)

function handleEditorInit(editorInstance: AceEditorType) {
  editor.value = editorInstance

  // 设置自动补全
  setupAutocomplete(editorInstance)

  // 添加快捷键：F5 执行查询
  editorInstance.commands.addCommand({
    name: 'executeQuery',
    bindKey: {win: 'F5', mac: 'F5'},
    exec: () => {
      handleExecute()
    }
  })
}

function handleSqlInput(value: string) {
  sqlContent.value = value
}

// 设置 SQL 自动补全
function setupAutocomplete(_editorInstance: AceEditorType) {
  // 获取 language_tools 扩展
  const langTools = ace?.require?.('ace/ext/language_tools')

  if (!langTools) {
    console.warn('Ace language_tools not available')
    return
  }

  // 移除默认的文本补全器
  langTools.setCompleters([])

  // 创建自定义补全器
  const sqlCompleter = {
    getCompletions: (_editor: AceEditorType, _session: IEditSession, _pos: Position, _prefix: string, callback: (error: any, results: any[]) => void) => {
      const completions: any[] = []

      // SQL 关键词
      const sqlKeywords = [
        'SELECT', 'FROM', 'WHERE', 'INSERT', 'UPDATE', 'DELETE', 'CREATE', 'DROP', 'ALTER',
        'TABLE', 'INDEX', 'VIEW', 'DATABASE', 'SCHEMA', 'TRIGGER', 'PROCEDURE', 'FUNCTION',
        'JOIN', 'INNER', 'LEFT', 'RIGHT', 'FULL', 'OUTER', 'ON', 'AS', 'AND', 'OR', 'NOT',
        'IN', 'EXISTS', 'LIKE', 'BETWEEN', 'IS', 'NULL', 'ORDER', 'BY', 'GROUP', 'HAVING',
        'LIMIT', 'OFFSET', 'DISTINCT', 'UNION', 'ALL', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END',
        'COUNT', 'SUM', 'AVG', 'MAX', 'MIN', 'CAST', 'CONVERT', 'IF', 'IFNULL', 'COALESCE',
        'DATE', 'TIME', 'DATETIME', 'YEAR', 'MONTH', 'DAY', 'HOUR', 'MINUTE', 'SECOND',
        'NOW', 'CURDATE', 'CURTIME', 'DATE_ADD', 'DATE_SUB', 'DATEDIFF', 'TIMESTAMPDIFF',
        'CONCAT', 'SUBSTRING', 'LENGTH', 'UPPER', 'LOWER', 'TRIM', 'LTRIM', 'RTRIM',
        'INT', 'VARCHAR', 'TEXT', 'DECIMAL', 'FLOAT', 'DOUBLE', 'BOOLEAN', 'DATE', 'DATETIME',
        'PRIMARY', 'KEY', 'FOREIGN', 'REFERENCES', 'CONSTRAINT', 'UNIQUE', 'CHECK', 'DEFAULT',
        'AUTO_INCREMENT', 'NOT', 'NULL', 'TRUE', 'FALSE'
      ]

      sqlKeywords.forEach(keyword => {
        completions.push({
          caption: keyword,
          snippet: keyword,
          meta: 'SQL Keyword',
          score: 1000,
          value: keyword
        })
      })

      // 表和字段补全
      if (databaseStructure.value) {
        const structure = databaseStructure.value

        // 表名补全
        if (structure.tables) {
          structure.tables.forEach((table: TableInfo) => {
            const tableName = table.pureName
            if (tableName) {
              completions.push({
                caption: tableName,
                snippet: tableName,
                meta: 'Table',
                score: 900,
                value: tableName
              })

              // 字段名补全（当输入 "表名." 时显示该表的字段）
              if (table.columns) {
                table.columns.forEach((column: ColumnInfo) => {
                  const columnName = column.columnName
                  if (columnName) {
                    completions.push({
                      caption: `${tableName}.${columnName}`,
                      snippet: `${tableName}.${columnName}`,
                      meta: `Column (${tableName})`,
                      score: 800,
                      value: `${tableName}.${columnName}`
                    })
                    // 也添加单独的字段名
                    completions.push({
                      caption: columnName,
                      snippet: columnName,
                      meta: `Column`,
                      score: 700,
                      value: columnName
                    })
                  }
                })
              }
            }
          })
        }

        // 视图名补全
        if (structure.views) {
          structure.views.forEach((view: any) => {
            const viewName = view.pureName || view.name
            if (viewName) {
              completions.push({
                caption: viewName,
                snippet: viewName,
                meta: 'View',
                score: 850,
                value: viewName
              })
            }
          })
        }
      }

      // 过滤匹配前缀的补全项
      const filtered = completions.filter(item =>
        item.value.toLowerCase().startsWith(_prefix.toLowerCase())
      )

      callback(null, filtered)
    }
  }

  // 添加补全器
  langTools.addCompleter(sqlCompleter)
}

const tableColumns = computed(() => {
  const cols = queryResult.value?.columns
  if (!Array.isArray(cols)) return []
  return cols.map((col: any, idx: number) => {
    const name = col?.columnName || `Column ${idx + 1}`
    return {
      title: name,
      dataIndex: name,
      key: name,
      width: 160,
      ellipsis: true,
    }
  })
})

function isEditingCell(rowKey: string | number, dataIndex: string): boolean {
  return !!editingResultCell.value && editingResultCell.value.rowKey === rowKey && editingResultCell.value.dataIndex === dataIndex
}

function handleCellClick(row: any, property: string) {
  activeResultCell.value = {rowKey: row?.key, dataIndex: property}
}

function handleTableRowClick(row: any) {
  activeResultCell.value = {
    rowKey: row?.key,
    dataIndex: (activeResultCell.value?.dataIndex || (tableColumns.value?.[0] as any)?.dataIndex) as string
  }
  focusResultsHotkeyHost()
}

function handleSelectionChange(selection: any[]) {
  resultSelectedRowKeys.value = selection.map((r: any) => r?.key).filter(Boolean)
}

function normalizeRowsToTableData(rows: any[], cols: any[]) {
  if (!Array.isArray(rows)) return []
  if (!Array.isArray(cols) || cols.length === 0) return rows.map((r: any, i: number) => ({key: i, ...(r || {})}))
  return rows.map((row: any, i: number) => {
    const rec: any = {key: i}
    cols.forEach((col: any, cidx: number) => {
      const name = col?.columnName || `Column ${cidx + 1}`
      if (row && typeof row === 'object' && !Array.isArray(row) && row[name] !== undefined) rec[name] = row[name]
      else if (Array.isArray(row) && row[cidx] !== undefined) rec[name] = row[cidx]
      else rec[name] = null
    })
    return rec
  })
}


function focusResultsHotkeyHost() {
  resultsHotkeyHost.value?.focus?.()
}

function startEditResultCell(rowKey: string | number, dataIndex: string) {
  if (rowKey === undefined || rowKey === null) return
  editingResultCell.value = {rowKey, dataIndex}
  const row = resultTableData.value.find((r) => r?.key === rowKey)
  editingResultValue.value = row?.[dataIndex] === null || row?.[dataIndex] === undefined ? '' : String(row?.[dataIndex])
  nextTick(() => focusResultsHotkeyHost())
}

function commitEditResultCell(rowKey: string | number, dataIndex: string) {
  const idx = resultTableData.value.findIndex((r) => r?.key === rowKey)
  if (idx >= 0) {
    const next = {...(resultTableData.value[idx] || {})}
    next[dataIndex] = editingResultValue.value
    resultTableData.value.splice(idx, 1, next)
  }
  editingResultCell.value = null
}

function clearResultSelection() {
  resultSelectedRowKeys.value = []
  activeResultCell.value = null
  editingResultCell.value = null
}

function handleCopyResults() {
  if (!queryResult.value) return
  const cols = (tableColumns.value || []).map((c: any) => c?.dataIndex).filter(Boolean)
  if (!cols.length) {
    ElMessage.info('没有可复制的列')
    return
  }

  // If rows selected -> copy those rows
  if (resultSelectedRowKeys.value.length > 0) {
    const rows = resultTableData.value.filter((r) => resultSelectedRowKeys.value.includes(r?.key))
    if (!rows.length) {
      ElMessage.info('没有可复制的数据')
      return
    }
    copyRowsToClipboard('textWithHeaders', cols, rows, {
      schemaName: undefined,
      pureName: undefined,
      driver: undefined,
      keyColumns: [],
    })
    ElMessage.success('已复制')
    return
  }

  // Otherwise copy active cell
  const cell = activeResultCell.value
  if (!cell) {
    ElMessage.info('请先点击一个单元格或选择行')
    return
  }
  const row = resultTableData.value.find((r) => r?.key === cell.rowKey)
  const value = row?.[cell.dataIndex]
  copyRowsToClipboard('textWithoutHeaders', [cell.dataIndex], [{[cell.dataIndex]: value}], {
    schemaName: undefined,
    pureName: undefined,
    driver: undefined,
    keyColumns: [],
  })
  ElMessage.success('已复制')
}

function handleResultsKeyDown(e: KeyboardEvent) {
  // Ctrl/Cmd + C
  // @ts-ignore
  if ((e.ctrlKey || e.metaKey) && (e.key === 'c' || e.key === 'C' || (e as any).keyCode === 67)) {
    e.preventDefault()
    handleCopyResults()
  }
}

// Element Plus 表格分页需要单独处理，这里暂时不使用分页
// 如果需要分页，可以使用 el-pagination 组件

const resultsInfo = computed(() => {
  if (error.value) return `错误: ${error.value}`
  const rows = queryResult.value?.rows
  const cols = queryResult.value?.columns
  const rc = Array.isArray(rows) ? rows.length : 0
  const cc = Array.isArray(cols) ? cols.length : 0
  return queryResult.value ? `查询成功，返回 ${rc} 行，${cc} 列` : ''
})

async function handleExecute() {
  if (!effectiveConid.value || !effectiveDatabaseName.value) {
    error.value = '请先选择数据库连接'
    showResults.value = true
    return
  }

  // Prefer executing selected SQL (Navicat-like behavior)
  const ed = editor.value
  const selectedSql = (ed?.getSelectedText?.() as string) || ''
  const sql = (selectedSql && selectedSql.trim() ? selectedSql : (sqlContent.value || '')).trim()
  if (!sql) {
    error.value = '请输入 SQL 查询语句'
    showResults.value = true
    return
  }

  error.value = ''
  queryResult.value = null
  showResults.value = true
  executing.value = true

  try {
    const result = await databaseConnectionsSqlSelectApi({
      conid: effectiveConid.value,
      database: effectiveDatabaseName.value,
      select: {sql},
    })

    // If backend returned an error, show the raw database error message
    if ((result as any)?.errorMessage) {
      error.value = String((result as any).errorMessage || '')
      return
    }
    const payload = (result as any)?.rows
    if (!payload) {
      // Keep the error as informative as possible
      error.value = '查询未返回结果（可能是执行失败或返回为空）'
      return
    }

    // backend mysql now returns MysqlRowsResult { rows: [...], columns: [...] }
    if (payload && typeof payload === 'object' && Array.isArray(payload.rows)) {
      const cols = Array.isArray(payload.columns) ? payload.columns : []
      const derivedCols =
        cols.length > 0
          ? cols.map((c: any) => ({columnName: c?.columnName || String(c)}))
          : Object.keys(payload.rows?.[0] || {}).map((k) => ({columnName: k}))
      queryResult.value = {rows: payload.rows, columns: derivedCols}
      resultTableData.value = normalizeRowsToTableData(payload.rows, derivedCols)
      clearResultSelection()
      
      // 保存查询历史（仅在查询成功时保存）
      saveQueryHistory(sql, effectiveConid.value, effectiveDatabaseName.value)
      return
    }

    // fallback: payload is plain array of row objects
    if (Array.isArray(payload)) {
      const derivedCols = Object.keys(payload?.[0] || {}).map((k) => ({columnName: k}))
      queryResult.value = {rows: payload, columns: derivedCols}
      resultTableData.value = normalizeRowsToTableData(payload, derivedCols)
      clearResultSelection()
      
      // 保存查询历史（仅在查询成功时保存）
      saveQueryHistory(sql, effectiveConid.value, effectiveDatabaseName.value)
      return
    }

    error.value = '查询结果格式不支持'
  } catch (err: any) {
    error.value = err?.message || err?.toString?.() || '执行 SQL 查询时发生错误'
    queryResult.value = null
    console.error('SQL execution error:', err)
  } finally {
    executing.value = false
  }
}

function handleClear() {
  sqlContent.value = ''
  queryResult.value = null
  error.value = ''
  showResults.value = false
  focusEditor()
}
</script>

<style scoped>
.sql-error-pre {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
  font-size: 12px;
  line-height: 1.4;
}
</style>
