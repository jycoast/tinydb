<template>
  <div style="display: flex; flex-direction: column; height: 100%; width: 100%;">
    <!-- 顶部工具栏 -->
    <div style="flex: 0 0 auto; padding: 8px 16px; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid var(--theme-border);">
      <Space>
        <AButton type="primary" :icon="h(PlayCircleOutlined)" :loading="executing" @click="handleExecute">
          执行 (F5)
        </AButton>
        <AButton :icon="h(DeleteOutlined)" @click="handleClear">清空</AButton>
      </Space>

      <Tag v-if="currentConid && currentDatabaseName" color="blue">
        {{ connectionName }} / {{ currentDatabaseName }}
      </Tag>
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
          </Space>
        </template>
        <div style="flex: 1; overflow: auto; padding: 12px;">
          <AAlert v-if="error" type="error" :message="error" show-icon closable @close="error = ''" />

          <ATable
            v-else-if="queryResult && tableData.length > 0"
            :columns="tableColumns"
            :data-source="tableData"
            :pagination="paginationConfig"
            :scroll="{ x: 'max-content', y: resultsScrollY }"
            size="middle"
            bordered
            :loading="executing"
          />

          <AEmpty v-else-if="queryResult && tableData.length === 0" description="查询成功，但没有返回数据" />
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
import { Alert as AAlert, Button as AButton, Card, Empty as AEmpty, Space, Table as ATable, Tag, Typography } from 'ant-design-vue'
import { DeleteOutlined, PlayCircleOutlined } from '@ant-design/icons-vue'

const { Text } = Typography
import { databaseConnectionsSqlSelectApi } from '/@/api/simpleApis'
import { getConnectionInfo, useDatabaseInfo } from '/@/api/bridge'
import AceEditor from '/@/second/query/AceEditor'
import * as ace from 'ace-builds/src-noconflict/ace'
import 'ace-builds/src-noconflict/ext-language_tools'
import type { DatabaseInfo, TableInfo, ColumnInfo } from '/@/second/tinydb-types'

const props = defineProps({
  tabid: { type: String as PropType<string>, required: true },
  conid: { type: String as PropType<string> },
  database: { type: String as PropType<string> },
  tabVisible: { type: Boolean as PropType<boolean>, default: true },
})

const bootstrap = useBootstrapStore()
const { currentDatabase } = storeToRefs(bootstrap)

const defaultPlaceholder = '-- 请输入 SQL 查询语句\nSELECT * FROM table_name LIMIT 100;'

const editor = ref<Nullable<ace.Editor>>(null)
const sqlContent = ref('')
const executing = ref(false)
const showResults = ref(false)
const error = ref('')
type SqlQueryResult = { rows: any[]; columns: Array<{ columnName: string }> }
const queryResult = ref<SqlQueryResult | null>(null)
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

const currentConid = computed(() => props.conid || currentDatabase.value?.connection?._id)
const currentDatabaseName = computed(() => props.database || currentDatabase.value?.name)

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
  () => [currentConid.value, currentDatabaseName.value],
  ([conid, database]) => {
    if (conid && database) {
      databaseInfoStore.value = null
      useDatabaseInfo({ conid, database }, databaseInfoStore)
    }
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

onMounted(async () => {
  recalcResultsScroll()
  window.addEventListener('resize', recalcResultsScroll)

  const saved = localStorage.getItem(`sql_query_${props.tabid}`)
  sqlContent.value = saved ?? defaultPlaceholder

  if (currentConid.value) {
    try {
      const conn = await getConnectionInfo({ conid: currentConid.value })
      connectionName.value = conn?.displayName || conn?.host || 'Unknown'
    } catch (e) {
      console.error('Failed to get connection info:', e)
    }
  }

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
function setupAutocomplete(editorInstance: ace.Editor) {
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
    getCompletions: (editor: ace.Editor, session: ace.IEditSession, pos: ace.Position, prefix: string, callback: (error: any, results: any[]) => void) => {
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
            const tableName = table.pureName || table.name
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
                  const columnName = column.columnName || column.pureName
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
        item.value.toLowerCase().startsWith(prefix.toLowerCase())
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
    return { title: name, dataIndex: name, key: name, width: 160, ellipsis: true }
  })
})

const tableData = computed(() => {
  const rows = queryResult.value?.rows
  const cols = queryResult.value?.columns
  if (!Array.isArray(rows)) return []

  if (!Array.isArray(cols) || cols.length === 0) {
    return rows.map((r: any, i: number) => ({ key: i, ...(r || {}) }))
  }

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
})

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
  if (!currentConid.value || !currentDatabaseName.value) {
    error.value = '请先选择数据库连接'
    showResults.value = true
    return
  }

  const sql = (sqlContent.value || '').trim()
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
      conid: currentConid.value,
      database: currentDatabaseName.value,
      select: { sql },
    })
    const payload = (result as any)?.rows
    if (!payload) {
      error.value = '查询返回空结果'
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
      return
    }

    // fallback: payload is plain array of row objects
    if (Array.isArray(payload)) {
      const derivedCols = Object.keys(payload?.[0] || {}).map((k) => ({ columnName: k }))
      queryResult.value = { rows: payload, columns: derivedCols }
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


