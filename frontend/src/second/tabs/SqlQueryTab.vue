<template>
  <div style="display: flex; flex-direction: column; height: 100%; width: 100%;">
    <!-- 顶部工具栏 -->
    <div style="flex: 0 0 auto; padding: 8px 16px; display: flex; flex-direction: column; gap: 8px; border-bottom: 1px solid var(--theme-border);">
    
      <div style="display: flex; align-items: center; justify-content: space-between;">
        <Space>
          <AButton :icon="h(OrderedListOutlined)" @click="handleConvertSelectionToInList">转 IN 列表</AButton>
          <AButton :icon="h(FormatPainterOutlined)" @click="handleFormatSql">SQL 美化</AButton>
        </Space>
      </div>

      <div style="display: flex; align-items: center; justify-content: space-between;">
        <Space>
        <ASelect
          v-model:value="selectedConid"
          style="min-width: 220px"
          size="middle"
          show-search
          allow-clear
          placeholder="选择数据源"
          :options="connectionOptions"
          :filter-option="filterSelectOption"
          @change="handleChangeConid"
        />
        <ASelect
          v-model:value="selectedObject"
          style="min-width: 260px"
          size="middle"
          show-search
          allow-clear
          placeholder="选择库/表"
          :filter-option="filterSelectOption"
          @select="handleSelectObject"
        >
          <ASelectOptGroup v-if="databaseOptions.length" label="Databases">
            <ASelectOption
              v-for="db in databaseOptions"
              :key="`db:${db}`"
              :value="`db:${db}`"
            >
              {{ db }}
            </ASelectOption>
          </ASelectOptGroup>

          <ASelectOptGroup v-if="tableOptions.length" label="Tables">
            <ASelectOption
              v-for="t in tableOptions"
              :key="`table:${t}`"
              :value="`table:${t}`"
            >
              {{ t }}
            </ASelectOption>
          </ASelectOptGroup>
        </ASelect>

        <AButton type="primary" :icon="h(PlayCircleOutlined)" :loading="executing" @click="handleExecute">
          执行 (F5)
        </AButton>
        <AButton :icon="h(DeleteOutlined)" @click="handleClear">清空</AButton>
        </Space>

        <Tag v-if="effectiveConid && effectiveDatabaseName" color="blue">
          {{ connectionName }} / {{ effectiveDatabaseName }}
        </Tag>
      </div>

    </div>

    <!-- 编辑区：Ace Editor -->
    <div style="flex: 1; min-height: 0; position: relative;">
      <AceEditor
        :value="sqlContent"
        mode="mysql"
        :options="editorOptions"
        @init="handleEditorInit"
        @input="handleSqlInput"
      />
    </div>

    <!-- 结果区 -->
    <div v-if="showResults" style="flex: 0 0 38%; min-height: 200px; max-height: 50%; display: flex; flex-direction: column; border-top: 1px solid var(--theme-border);">
      <Card :bordered="false" style="flex: 1; display: flex; flex-direction: column; overflow: hidden;">
        <template #title>
          <Space>
            <span>查询结果</span>
            <Text v-if="resultsInfo" type="secondary" style="font-size: 12px;">{{ resultsInfo }}</Text>
            <Tag v-if="queryResult && !error" color="gold">结果可编辑（仅本地，不写回数据库）</Tag>
          </Space>
        </template>
        <template #extra>
          <Space>
            <AButton size="small" :icon="h(CopyOutlined)" @click="handleCopyResults">复制 (Ctrl+C)</AButton>
            <AButton size="small" @click="clearResultSelection">清除选择</AButton>
          </Space>
        </template>
        <div
          ref="resultsHotkeyHost"
          tabindex="0"
          style="flex: 1; overflow: auto; padding: 12px; outline: none;"
          @mousedown="focusResultsHotkeyHost"
          @keydown="handleResultsKeyDown"
        >
          <AAlert v-if="error" type="error" message="执行失败" show-icon closable @close="error = ''">
            <template #description>
              <pre class="sql-error-pre">{{ error }}</pre>
            </template>
          </AAlert>

          <ATable
            v-else-if="queryResult && resultTableData.length > 0"
            :columns="tableColumns"
            :data-source="resultTableData"
            :pagination="paginationConfig"
            :scroll="{ x: 'max-content', y: resultsScrollY }"
            size="middle"
            bordered
            :loading="executing"
            :row-selection="rowSelection"
            :custom-row="customRow"
          />

          <AEmpty v-else-if="queryResult && resultTableData.length === 0" description="查询成功，但没有返回数据" />
        </div>
      </Card>
    </div>
  </div>
</template>

<script lang="ts">
// 给 openNewTab 用：用于判断是否复用已有 tab
export const matchingProps = ['conid', 'database']
export const allowAddToFavorites = (_: any) => true
</script>

<script lang="ts" setup>
import { computed, h, nextTick, onBeforeUnmount, onMounted, PropType, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useBootstrapStore } from '/@/store/modules/bootstrap'
import { Alert as AAlert, Button as AButton, Card, Empty as AEmpty, Input as AInput, Select as ASelect, Space, Table as ATable, Tag, Typography, message } from 'ant-design-vue'
import { DeleteOutlined, PlayCircleOutlined, OrderedListOutlined, FormatPainterOutlined, CopyOutlined } from '@ant-design/icons-vue'
import { databaseConnectionsSqlSelectApi } from '/@/api/simpleApis'
import { getConnectionInfo, useDatabaseInfo } from '/@/api/bridge'
import AceEditor from '/@/second/query/AceEditor'
import * as ace from 'ace-builds/src-noconflict/ace'
import 'ace-builds/src-noconflict/ext-language_tools'
import type { DatabaseInfo, TableInfo, ColumnInfo } from '/@/second/tinydb-types'
import { useClusterApiStore } from '/@/store/modules/clusterApi'
import { copyRowsToClipboard } from '/@/second/utility/clipboard'

const { Text } = Typography

const ASelectOption = (ASelect as any).Option
const ASelectOptGroup = (ASelect as any).OptGroup

const props = defineProps({
  tabid: { type: String as PropType<string>, required: true },
  conid: { type: String as PropType<string> },
  database: { type: String as PropType<string> },
  tabVisible: { type: Boolean as PropType<boolean>, default: true },
  // If true, don't auto-select currentDatabase; user must pick connection/db manually
  noPrefill: { type: Boolean as PropType<boolean>, default: false },
})

const bootstrap = useBootstrapStore()
const { currentDatabase } = storeToRefs(bootstrap)
const clusterApi = useClusterApiStore()
const { connectionList } = storeToRefs(clusterApi)

const defaultPlaceholder = '-- 请输入 SQL 查询语句\nSELECT * FROM table_name LIMIT 100;'

const editor = ref<Nullable<ace.Editor>>(null)
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
  { immediate: true }
)

function filterSelectOption(input: string, option: any) {
  const v = (option?.label ?? option?.children ?? option?.value ?? '').toString().toLowerCase()
  return v.includes((input || '').toLowerCase())
}

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
    message.warning('编辑器未就绪')
    return
  }
  const sel = (ed.getSelectedText?.() as string) || ''
  if (!sel || !sel.trim()) {
    message.info('请先选中要转换的内容（每行一个值）')
    return
  }
  const converted = toInListText(sel)
  if (!converted) {
    message.info('选中内容为空，无法转换')
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
    message.warning('编辑器未就绪')
    return
  }

  const selectedText = (ed.getSelectedText?.() as string) || ''
  const source = selectedText && selectedText.trim() ? selectedText : ed.getValue()
  if (!source || !source.trim()) {
    message.info('没有可美化的 SQL')
    return
  }

  try {
    // Lazy-load to keep initial bundle small
    const mod: any = await import('sql-formatter')
    const formatFn = mod?.format || mod?.default?.format
    if (typeof formatFn !== 'function') {
      message.error('SQL 格式化模块加载失败')
      return
    }

    const formatted = formatFn(source, {
      language: 'mysql',
      keywordCase: 'upper',
      linesBetweenQueries: 1,
      tabWidth: 2,
    })

    if (selectedText && selectedText.trim()) {
      // @ts-ignore
      const range = ed.getSelectionRange()
      ed.session.replace(range, formatted)
      ed.clearSelection()
      ed.focus()
      return
    }

    const pos = ed.getCursorPosition()
    ed.setValue(formatted, -1)
    // Best-effort: restore cursor
    try {
      const lineCount = ed.session.getLength()
      const row = Math.min(Math.max(0, pos.row), Math.max(0, lineCount - 1))
      const line = ed.session.getLine(row) || ''
      const col = Math.min(Math.max(0, pos.column), line.length)
      ed.moveCursorTo(row, col)
    } catch {
      // ignore
    }
    ed.focus()
  } catch (e: any) {
    message.error(`SQL 美化失败：${e?.message || e}`)
  }
}

async function handleChangeConid(conid?: string) {
  selectedConid.value = conid
  selectedObject.value = undefined
  selectedDatabase.value = undefined

  if (!conid) {
    message.warning('请选择数据源')
    return
  }

  try {
    const conn = await getConnectionInfo({ conid })
    if (!conn) {
      message.error('无法获取连接信息')
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
    message.error(`切换数据源失败：${e?.message || e}`)
  }
}

async function handleSelectObject(val: string) {
  if (!val) return
  const conid = effectiveConid.value
  if (!conid) {
    message.warning('请先选择数据源')
    return
  }

  if (val.startsWith('db:')) {
    const db = val.slice(3)
    selectedDatabase.value = db
    try {
      const conn = await getConnectionInfo({ conid, database: db })
      if (!conn) {
        message.error('无法获取连接信息')
        return
      }
      bootstrap.setCurrentDatabase({
        connection: conn,
        name: db,
        title: db,
      } as any)
    } catch (e: any) {
      message.error(`切换数据库失败：${e?.message || e}`)
    }
    return
  }

  if (val.startsWith('table:')) {
    const table = val.slice(6)
    const tpl = `SELECT *\nFROM \`${table}\`\nLIMIT 100;`
    // If it's still placeholder-ish, replace; otherwise just append
    const cur = (sqlContent.value || '').trim()
    if (!cur || cur === defaultPlaceholder.trim() || cur.includes('SELECT * FROM table_name')) {
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
    { conid: currentConid.value, database: currentDatabaseName.value },
    databaseInfoStore
  )
}

watch(
  () => [effectiveConid.value, effectiveDatabaseName.value],
  ([conid, database]) => {
    if (conid && database) {
      databaseInfoStore.value = null
      useDatabaseInfo({ conid, database }, databaseInfoStore)
    }
  },
  { immediate: true }
)

watch(
  () => currentConid.value,
  (v) => {
    if (v) selectedConid.value = v
  },
  { immediate: true }
)

watch(
  () => currentDatabaseName.value,
  (v) => {
    // If user didn't pick a DB explicitly, follow the current database
    if (!selectedDatabase.value && v) selectedDatabase.value = v
  },
  { immediate: true }
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
    const conn = await getConnectionInfo({ conid })
    connectionName.value = conn?.displayName || conn?.host || 'Unknown'
  } catch (e) {
    console.error('Failed to get connection info:', e)
  }
}

onMounted(async () => {
  recalcResultsScroll()
  window.addEventListener('resize', recalcResultsScroll)

  const saved = localStorage.getItem(`sql_query_${props.tabid}`)
  sqlContent.value = saved ?? defaultPlaceholder

  await refreshConnectionLabel()

  if (props.tabVisible) focusEditor()
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', recalcResultsScroll)
})

watch(
  () => props.tabVisible,
  (v) => {
    if (v) focusEditor()
  },
  { immediate: true },
)

watch(
  () => sqlContent.value,
  (val) => {
    localStorage.setItem(`sql_query_${props.tabid}`, val ?? '')
  },
)

function handleEditorInit(editorInstance: ace.Editor) {
  editor.value = editorInstance
  
  // 设置自动补全
  setupAutocomplete(editorInstance)
  
  // 添加快捷键：F5 执行查询
  editorInstance.commands.addCommand({
    name: 'executeQuery',
    bindKey: { win: 'F5', mac: 'F5' },
    exec: () => {
      handleExecute()
    }
  })
}

function handleSqlInput(value: string) {
  sqlContent.value = value
}

// 设置 SQL 自动补全
function setupAutocomplete(_editorInstance: ace.Editor) {
  // 获取 language_tools 扩展
  const langTools = ace.require('ace/ext/language_tools')
  
  if (!langTools) {
    console.warn('Ace language_tools not available')
    return
  }
  
  // 移除默认的文本补全器
  langTools.setCompleters([])
  
  // 创建自定义补全器
  const sqlCompleter = {
    getCompletions: (_editor: ace.Editor, _session: ace.IEditSession, _pos: ace.Position, _prefix: string, callback: (error: any, results: any[]) => void) => {
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
      // enable inline edit/copy interaction on every cell
      customCell: (record: any) => ({
        onClick: () => {
          activeResultCell.value = { rowKey: record?.key, dataIndex: name }
        },
        onDblclick: () => startEditResultCell(record?.key, name),
      }),
      customRender: ({ text, record }: any) => {
        const rowKey = record?.key
        const isEditing = !!editingResultCell.value && editingResultCell.value.rowKey === rowKey && editingResultCell.value.dataIndex === name
        if (!isEditing) return text
        return h(AInput as any, {
          size: 'small',
          value: editingResultValue.value,
          autofocus: true,
          onChange: (e: any) => (editingResultValue.value = e?.target?.value ?? ''),
          onPressEnter: () => commitEditResultCell(rowKey, name),
          onBlur: () => commitEditResultCell(rowKey, name),
        })
      },
    }
  })
})

function normalizeRowsToTableData(rows: any[], cols: any[]) {
  if (!Array.isArray(rows)) return []
  if (!Array.isArray(cols) || cols.length === 0) return rows.map((r: any, i: number) => ({ key: i, ...(r || {}) }))
  return rows.map((row: any, i: number) => {
    const rec: any = { key: i }
    cols.forEach((col: any, cidx: number) => {
      const name = col?.columnName || `Column ${cidx + 1}`
      if (row && typeof row === 'object' && !Array.isArray(row) && row[name] !== undefined) rec[name] = row[name]
      else if (Array.isArray(row) && row[cidx] !== undefined) rec[name] = row[cidx]
      else rec[name] = null
    })
    return rec
  })
}

const rowSelection = computed(() => ({
  selectedRowKeys: resultSelectedRowKeys.value,
  onChange: (keys: any[]) => {
    resultSelectedRowKeys.value = keys || []
  },
}))

function customRow(record: any) {
  return {
    onClick: () => {
      activeResultCell.value = { rowKey: record?.key, dataIndex: (activeResultCell.value?.dataIndex || (tableColumns.value?.[0] as any)?.dataIndex) as string }
      focusResultsHotkeyHost()
    },
  }
}

function focusResultsHotkeyHost() {
  resultsHotkeyHost.value?.focus?.()
}

function startEditResultCell(rowKey: string | number, dataIndex: string) {
  if (rowKey === undefined || rowKey === null) return
  editingResultCell.value = { rowKey, dataIndex }
  const row = resultTableData.value.find((r) => r?.key === rowKey)
  editingResultValue.value = row?.[dataIndex] === null || row?.[dataIndex] === undefined ? '' : String(row?.[dataIndex])
  nextTick(() => focusResultsHotkeyHost())
}

function commitEditResultCell(rowKey: string | number, dataIndex: string) {
  const idx = resultTableData.value.findIndex((r) => r?.key === rowKey)
  if (idx >= 0) {
    const next = { ...(resultTableData.value[idx] || {}) }
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
    message.info('没有可复制的列')
    return
  }

  // If rows selected -> copy those rows
  if (resultSelectedRowKeys.value.length > 0) {
    const rows = resultTableData.value.filter((r) => resultSelectedRowKeys.value.includes(r?.key))
    if (!rows.length) {
      message.info('没有可复制的数据')
      return
    }
    copyRowsToClipboard('textWithHeaders', cols, rows, {
      schemaName: undefined,
      pureName: undefined,
      driver: undefined,
      keyColumns: [],
    })
    message.success('已复制')
    return
  }

  // Otherwise copy active cell
  const cell = activeResultCell.value
  if (!cell) {
    message.info('请先点击一个单元格或选择行')
    return
  }
  const row = resultTableData.value.find((r) => r?.key === cell.rowKey)
  const value = row?.[cell.dataIndex]
  copyRowsToClipboard('textWithoutHeaders', [cell.dataIndex], [{ [cell.dataIndex]: value }], {
    schemaName: undefined,
    pureName: undefined,
    driver: undefined,
    keyColumns: [],
  })
  message.success('已复制')
}

function handleResultsKeyDown(e: KeyboardEvent) {
  // Ctrl/Cmd + C
  // @ts-ignore
  if ((e.ctrlKey || e.metaKey) && (e.key === 'c' || e.key === 'C' || (e as any).keyCode === 67)) {
    e.preventDefault()
    handleCopyResults()
  }
}

const paginationConfig = computed(() => ({
  pageSize: 50,
  showSizeChanger: true,
  showQuickJumper: true,
  showTotal: (total: number) => `共 ${total} 条记录`,
  pageSizeOptions: ['20', '50', '100', '200', '500'],
}))

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
      select: { sql },
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
          ? cols.map((c: any) => ({ columnName: c?.columnName || String(c) }))
          : Object.keys(payload.rows?.[0] || {}).map((k) => ({ columnName: k }))
      queryResult.value = { rows: payload.rows, columns: derivedCols }
      resultTableData.value = normalizeRowsToTableData(payload.rows, derivedCols)
      clearResultSelection()
      return
    }

    // fallback: payload is plain array of row objects
    if (Array.isArray(payload)) {
      const derivedCols = Object.keys(payload?.[0] || {}).map((k) => ({ columnName: k }))
      queryResult.value = { rows: payload, columns: derivedCols }
      resultTableData.value = normalizeRowsToTableData(payload, derivedCols)
      clearResultSelection()
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


