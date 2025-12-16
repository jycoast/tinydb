<template>
  <div class="sqlq-root">
    <!-- 顶部工具栏 -->
    <div class="sqlq-toolbar">
      <div class="sqlq-toolbar-left">
        <AButton type="primary" :icon="h(PlayCircleOutlined)" :loading="executing" @click="handleExecute">
          执行 (F5)
        </AButton>
        <AButton :icon="h(DeleteOutlined)" @click="handleClear">清空</AButton>
      </div>

      <div class="sqlq-toolbar-right" v-if="currentConid && currentDatabaseName">
        <span class="sqlq-pill">
          <span class="sqlq-conn">{{ connectionName }}</span>
          <span class="sqlq-sep">/</span>
          <span class="sqlq-db">{{ currentDatabaseName }}</span>
        </span>
      </div>
    </div>

    <!-- 编辑区：原生 textarea（确保一定可输入） -->
    <div class="sqlq-editor">
      <textarea
        ref="textareaRef"
        v-model="sqlContent"
        class="sqlq-textarea"
        :placeholder="defaultPlaceholder"
        spellcheck="false"
        autocomplete="off"
        autocapitalize="off"
        @mousedown.stop
        @click.stop
        @keydown="handleKeydown"
      ></textarea>
    </div>

    <!-- 结果区 -->
    <div v-if="showResults" class="sqlq-results">
      <div class="sqlq-results-header">
        <div class="sqlq-results-title">查询结果</div>
        <div class="sqlq-results-info" v-if="resultsInfo">{{ resultsInfo }}</div>
      </div>

      <div class="sqlq-results-body">
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
import { Alert as AAlert, Button as AButton, Empty as AEmpty, Table as ATable } from 'ant-design-vue'
import { DeleteOutlined, PlayCircleOutlined } from '@ant-design/icons-vue'
import { databaseConnectionsSqlSelectApi } from '/@/api/simpleApis'
import { getConnectionInfo } from '/@/api/bridge'

const props = defineProps({
  tabid: { type: String as PropType<string>, required: true },
  conid: { type: String as PropType<string> },
  database: { type: String as PropType<string> },
  tabVisible: { type: Boolean as PropType<boolean>, default: true },
})

const bootstrap = useBootstrapStore()
const { currentDatabase } = storeToRefs(bootstrap)

const defaultPlaceholder = '-- 请输入 SQL 查询语句\nSELECT * FROM table_name LIMIT 100;'

const textareaRef = ref<HTMLTextAreaElement | null>(null)
const sqlContent = ref('')
const executing = ref(false)
const showResults = ref(false)
const error = ref('')
type SqlQueryResult = { rows: any[]; columns: Array<{ columnName: string }> }
const queryResult = ref<SqlQueryResult | null>(null)
const connectionName = ref('')
const resultsScrollY = ref<number>(260)

const currentConid = computed(() => props.conid || currentDatabase.value?.connection?._id)
const currentDatabaseName = computed(() => props.database || currentDatabase.value?.name)

function focusEditor() {
  nextTick(() => {
    textareaRef.value?.focus?.()
  })
}

function recalcResultsScroll() {
  const h = window.innerHeight || 900
  resultsScrollY.value = Math.max(160, Math.min(520, Math.floor(h * 0.28)))
}

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

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'F5') {
    e.preventDefault()
    void handleExecute()
  }
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

<style scoped>
.sqlq-root {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  min-height: 0;
  min-width: 0;
  background: var(--theme-bg-0);
  color: var(--theme-font-1);
}

.sqlq-toolbar {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px;
  background: var(--theme-bg-1);
  border-bottom: 1px solid var(--theme-border);
}

.sqlq-toolbar-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.sqlq-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  background: var(--theme-bg-2);
  border: 1px solid var(--theme-border);
  border-radius: 4px;
  font-size: 12px;
}

.sqlq-conn {
  font-weight: 600;
}

.sqlq-sep {
  color: var(--theme-font-3);
}

.sqlq-db {
  color: var(--theme-font-2);
}

.sqlq-editor {
  flex: 1;
  min-height: 0;
  padding: 12px;
  background: var(--theme-bg-0);
}

.sqlq-textarea {
  width: 100%;
  height: 100%;
  min-height: 220px;
  resize: none;
  outline: none;
  pointer-events: auto;
  position: relative;
  z-index: 2;
  border-radius: 6px;
  border: 1px solid var(--theme-border);
  background: var(--theme-bg-0);
  color: var(--theme-font-1);
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
  font-size: 13px;
  line-height: 1.6;
  padding: 10px 12px;
  box-sizing: border-box;
}

.sqlq-textarea:focus {
  border-color: var(--theme-bg-selected-point);
  box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.18);
}

.sqlq-results {
  flex: 0 0 auto;
  height: 38%;
  min-height: 200px;
  border-top: 1px solid var(--theme-border);
  background: var(--theme-bg-0);
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.sqlq-results-header {
  flex: 0 0 auto;
  display: flex;
  align-items: baseline;
  gap: 12px;
  padding: 10px 12px;
  background: var(--theme-bg-1);
  border-bottom: 1px solid var(--theme-border);
}

.sqlq-results-title {
  font-weight: 700;
}

.sqlq-results-info {
  font-size: 12px;
  color: var(--theme-font-3);
}

.sqlq-results-body {
  flex: 1;
  min-height: 0;
  padding: 12px;
  overflow: hidden;
}
</style>

