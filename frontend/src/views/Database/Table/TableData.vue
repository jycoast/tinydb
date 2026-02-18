<template>
  <div class="table-data-page">
    <div v-if="columnNames.length > 0" class="filter-section">
      <div class="filter-rows">
        <div v-for="(item, index) in filterConditions" :key="item.id" class="filter-row-single">
          <el-select
            v-model="item.field"
            size="small"
            placeholder="选择字段"
            class="filter-field"
            filterable
            default-first-option
            allow-create
          >
            <el-option
              v-for="col in columnNames"
              :key="col"
              :label="col"
              :value="col"
            />
          </el-select>
          <el-select
            v-model="item.operator"
            size="small"
            placeholder="条件"
            class="filter-operator"
          >
            <el-option label="=" value="=" />
            <el-option label="<>" value="<>" />
            <el-option label=">" value=">" />
            <el-option label="<" value="<" />
            <el-option label=">=" value=">=" />
            <el-option label="<=" value="<=" />
            <el-option label="LIKE" value="LIKE" />
            <el-option label="NOT LIKE" value="NOT LIKE" />
            <el-option label="IS NULL" value="IS NULL" />
            <el-option label="IS NOT NULL" value="IS NOT NULL" />
          </el-select>
          <el-input
            v-model="item.value"
            size="small"
            placeholder="值"
            class="filter-value"
            clearable
            :disabled="isValueDisabled(item.operator)"
          />
          <el-button size="small" type="danger" link :icon="Delete" @click="removeFilterCondition(index)" />
        </div>
      </div>
      <div class="filter-actions">
        <el-button size="small" @click="addFilterCondition">添加条件</el-button>
        <el-button type="primary" size="small" :loading="loading" @click="applyFilter">查询</el-button>
        <el-button size="small" @click="clearFilter">清空条件</el-button>
        <el-button type="primary" size="small" :icon="RefreshRight" :loading="loading" @click="loadData">
        刷新
        </el-button>
      </div>
    </div>
    <div v-if="error" class="error-row">
      <el-alert type="error" :title="error" show-icon />
    </div>
    <div class="table-wrap" v-loading="loading">
      <el-table
        :data="tableRows"
        border
        stripe
        size="small"
        max-height="calc(100vh - 220px)"
        style="width: 100%"
      >
        <el-table-column
          v-for="col in tableColumns"
          :key="col.dataIndex"
          :prop="col.dataIndex"
          :label="col.title"
          :min-width="col.width"
          show-overflow-tooltip
        />
        <template #empty>
          <el-empty description="暂无数据" />
        </template>
      </el-table>
    </div>
    <div class="pagination-row">
      <span class="summary">
        {{ summaryText }}
      </span>
      <el-pagination
        v-model:current-page="currentPage"
        :page-size="pageSize"
        :total="totalDisplay"
        layout="prev, pager, next, sizes"
        :page-sizes="[50, 100, 200, 500]"
        small
        @current-change="onPageChange"
        @size-change="onSizeChange"
      />
    </div>
  </div>
</template>

<script lang="ts">
export const matchingProps = ['conid', 'database', 'schemaName', 'pureName']
</script>

<script lang="ts" setup>
import { ref, computed, watch, onMounted } from 'vue'
import { RefreshRight, Delete } from '@element-plus/icons-vue'
import { databaseConnectionsSqlSelectApi } from '/@/api'

const props = withDefaults(
  defineProps<{
    conid: string
    database: string
    schemaName?: string
    pureName: string
  }>(),
  { schemaName: '' }
)

const pageSize = ref(100)
const currentPage = ref(1)
const loading = ref(false)
const error = ref('')
const rows = ref<any[]>([])
const hasMore = ref(true)
const columnNames = ref<string[]>([])
let filterIdCounter = 0
interface FilterCondition {
  id: number
  field: string
  operator: string
  value: string
}
const filterConditions = ref<FilterCondition[]>([])

const tableDisplayName = computed(() =>
  props.schemaName ? `${props.schemaName}.${props.pureName}` : props.pureName
)

function quoteIdentifier(s: string): string {
  return '`' + String(s).replace(/`/g, '``') + '`'
}

function escapeSqlValue(val: string): string {
  const v = String(val).trim()
  const num = Number(v)
  if (v !== '' && !Number.isNaN(num) && String(num) === v) return v
  return "'" + v.replace(/'/g, "''") + "'"
}

function buildWhereClause(): string {
  const parts: string[] = []
  for (const item of filterConditions.value) {
    const field = (item.field || '').trim()
    const op = (item.operator || '').trim()
    const val = (item.value || '').trim()
    if (!field) continue
    const quotedCol = quoteIdentifier(field)
    if (op === 'IS NULL') {
      parts.push(`${quotedCol} IS NULL`)
      continue
    }
    if (op === 'IS NOT NULL') {
      parts.push(`${quotedCol} IS NOT NULL`)
      continue
    }
    if (!op) continue
    if (val === '' && (op === '=' || op === '<>')) {
      parts.push(op === '=' ? `${quotedCol} IS NULL` : `${quotedCol} IS NOT NULL`)
    } else if (val !== '') {
      parts.push(`${quotedCol} ${op} ${escapeSqlValue(val)}`)
    }
  }
  if (parts.length === 0) return ''
  return ' WHERE ' + parts.join(' AND ')
}

function buildSql(limit: number, offset: number): string {
  const quoted =
    props.schemaName
      ? `${quoteIdentifier(props.schemaName)}.${quoteIdentifier(props.pureName)}`
      : quoteIdentifier(props.pureName)
  const where = buildWhereClause()
  return `SELECT * FROM ${quoted}${where} LIMIT ${limit} OFFSET ${offset}`
}

function isValueDisabled(operator: string): boolean {
  return operator === 'IS NULL' || operator === 'IS NOT NULL'
}

function addFilterCondition() {
  const firstCol = columnNames.value[0] || ''
  filterConditions.value.push({
    id: ++filterIdCounter,
    field: firstCol,
    operator: '=',
    value: ''
  })
}

function removeFilterCondition(index: number) {
  filterConditions.value.splice(index, 1)
}

function applyFilter() {
  currentPage.value = 1
  loadData()
}

function clearFilter() {
  filterConditions.value = []
  currentPage.value = 1
  loadData()
}

async function loadData() {
  if (!props.conid || !props.database || !props.pureName) {
    error.value = '缺少连接或表信息'
    return
  }
  error.value = ''
  loading.value = true
  const limit = pageSize.value
  const offset = (currentPage.value - 1) * limit
  try {
    const result = (await databaseConnectionsSqlSelectApi({
      conid: props.conid,
      database: props.database,
      select: { sql: buildSql(limit, offset) }
    })) as any
    if (result?.errorMessage) {
      error.value = String(result.errorMessage)
      rows.value = []
      return
    }
    const payload = result?.rows
    if (!payload) {
      rows.value = []
      return
    }
    if (typeof payload === 'object' && Array.isArray(payload.rows)) {
      rows.value = payload.rows
      hasMore.value = payload.rows.length >= limit
      if (payload.rows.length > 0 && payload.rows[0] && typeof payload.rows[0] === 'object') {
        columnNames.value = Object.keys(payload.rows[0])
      }
      return
    }
    if (Array.isArray(payload)) {
      rows.value = payload
      hasMore.value = payload.length >= limit
      if (payload.length > 0 && payload[0] && typeof payload[0] === 'object') {
        columnNames.value = Object.keys(payload[0])
      }
    }
  } catch (e: any) {
    error.value = e?.message || String(e)
    rows.value = []
  } finally {
    loading.value = false
  }
}

const tableColumns = computed(() => {
  const cols = columnNames.value.length > 0 ? columnNames.value : (rows.value[0] && typeof rows.value[0] === 'object' && !Array.isArray(rows.value[0]) ? Object.keys(rows.value[0]) : [])
  return cols.map((k) => ({ title: k, dataIndex: k, key: k, width: 140 }))
})

const tableRows = computed(() => {
  return rows.value.map((r: any, i: number) => ({ key: (currentPage.value - 1) * pageSize.value + i, ...r }))
})

const totalDisplay = computed(() => {
  const base = (currentPage.value - 1) * pageSize.value + rows.value.length
  if (hasMore.value && rows.value.length === pageSize.value) return base + 1
  return base
})

const summaryText = computed(() => {
  const from = (currentPage.value - 1) * pageSize.value + 1
  const to = (currentPage.value - 1) * pageSize.value + rows.value.length
  if (rows.value.length === 0) return '0 条'
  if (hasMore.value && rows.value.length === pageSize.value) return `第 ${from}-${to} 条（可能有更多）`
  return `第 ${from}-${to} 条，共 ${to} 条`
})

function onPageChange() {
  loadData()
}

function onSizeChange() {
  currentPage.value = 1
  loadData()
}

watch(
  () => [props.conid, props.database, props.schemaName, props.pureName],
  () => {
    currentPage.value = 1
    loadData()
  }
)

onMounted(() => {
  loadData()
})
</script>

<style scoped>
.table-data-page {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 12px 16px;
  overflow: hidden;
  width: 100%;
}
.toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
  flex-shrink: 0;
}
.table-title {
  font-weight: 600;
  color: var(--el-text-color-primary);
}
.error-row {
  margin-bottom: 12px;
  flex-shrink: 0;
}
.table-wrap {
  flex: 1;
  min-height: 0;
  overflow: auto;
  width: 100%;
}
.pagination-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 12px;
  flex-shrink: 0;
}
.summary {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
.filter-section {
  margin-bottom: 12px;
  padding: 12px;
  background: var(--el-fill-color-light);
  border-radius: 6px;
  flex-shrink: 0;
}
.filter-rows {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.filter-row-single {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.filter-field {
  width: 160px;
}
.filter-operator {
  width: 110px;
}
.filter-value {
  width: 160px;
}
.filter-actions {
  margin-top: 10px;
  display: flex;
  gap: 8px;
  align-items: center;
}
</style>
