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
        @selection-change="handleSelectionChange"
        @row-contextmenu="handleRowRightClick"
      >
        <el-table-column type="selection" width="55" />
        <el-table-column
          v-for="(col, colIndex) in tableColumns"
          :key="col.dataIndex"
          :prop="col.dataIndex"
          :label="col.title"
          :min-width="col.width"
          show-overflow-tooltip
        >
          <template #default="{ row, $index }">
            <div 
              class="cell-container"
              :class="{ 'cell-editing': isCellEditing($index, colIndex) }"
              @click="startCellEdit($index, colIndex, row[col.dataIndex])"
            >
              <template v-if="isCellEditing($index, colIndex)">
                <input
                  :ref="(el) => setEditingInputRef(el, $index, colIndex)"
                  v-model="editingCell!.currentValue"
                  class="cell-input"
                  @blur="cancelCellEdit"
                  @keydown.enter="saveCellEdit"
                  @keydown.esc="cancelCellEdit"
                  @keydown.tab.prevent
                />
              </template>
              <template v-else>
                <span class="cell-value">{{ formatCellValue(row[col.dataIndex]) }}</span>
              </template>
            </div>
          </template>
        </el-table-column>
        <template #empty>
          <el-empty description="暂无数据" />
        </template>
      </el-table>
    </div>
    
    <!-- 右键菜单 -->
    <div 
      v-if="contextMenuVisible" 
      class="context-menu" 
      :style="{ left: contextMenuX + 'px', top: contextMenuY + 'px' }"
      @mouseleave="hideContextMenu"
    >
      <div 
        class="context-menu-item" 
        @click="handleCopyAsInsert"
      >
        复制为Insert语句
      </div>
    </div>
    
    <div class="pagination-row">
      <div class="pagination-left">
        <el-button
          v-if="editingCell"
          type="primary"
          :icon="CircleCheck"
          size="small"
          @click="saveCellEdit"
          class="submit-edit-btn"
        >
          提交
        </el-button>
        <span class="summary">
          {{ summaryText }}
        </span>
      </div>
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
import { RefreshRight, Delete, CircleCheck } from '@element-plus/icons-vue'
import { databaseConnectionsSqlSelectApi, useDatabaseInfo } from '/@/api'
import { ElMessage } from 'element-plus'
import type { ContextMenuItem } from '/@/components/Modals/typing'
import { copyRowsToClipboard } from '/@/utils/tinydb/clipboard'

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
const selectedRows = ref<any[]>([])
const contextMenuVisible = ref(false)
const contextMenuX = ref(0)
const contextMenuY = ref(0)
const rightClickedRow = ref<any>(null)
const tableStructure = ref<any>(null)

// Cell editing state
const editingCell = ref<{ rowIndex: number; columnIndex: number; originalValue: any; currentValue: any } | null>(null)
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
  // Priority 1: Use table structure columns if available (maintains database-defined order)
  if (tableStructure.value && tableStructure.value.columns && Array.isArray(tableStructure.value.columns)) {
    return tableStructure.value.columns.map((col: any) => ({
      title: col.columnName || col.name,
      dataIndex: col.columnName || col.name,
      key: col.columnName || col.name,
      width: 140
    }))
  }
  
  // Priority 2: Use columnNames (from SELECT query)
  if (columnNames.value.length > 0) {
    return columnNames.value.map((k) => ({ title: k, dataIndex: k, key: k, width: 140 }))
  }
  
  // Priority 3: Derive from first row data (fallback)
  if (rows.value.length > 0 && rows.value[0] && typeof rows.value[0] === 'object') {
    const keys = Object.keys(rows.value[0]).filter(key => key !== 'key')
    return keys.map((k) => ({ title: k, dataIndex: k, key: k, width: 140 }))
  }
  
  return []
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

async function loadTableStructure() {
  if (!props.conid || !props.database || !props.pureName) {
    return
  }
  
  try {
    // Load database structure to get proper column order
    const structureRef = ref<any>(null)
    useDatabaseInfo(
      { 
        conid: props.conid, 
        database: props.database 
      }, 
      structureRef
    )
    
    // Wait for structure to load
    let retries = 0
    while (retries < 10 && (!structureRef.value || !structureRef.value.tables)) {
      await new Promise(resolve => setTimeout(resolve, 200))
      retries++
    }
    
    if (structureRef.value && structureRef.value.tables) {
      // Find the specific table
      const table = structureRef.value.tables.find((t: any) => 
        t.pureName === props.pureName && 
        (props.schemaName ? t.schemaName === props.schemaName : true)
      )
      
      if (table) {
        tableStructure.value = table
      }
    }
  } catch (e) {
    console.warn('Failed to load table structure:', e)
    // Continue without structure - will fall back to other methods
  }
}

function handleSelectionChange(selection: any[]) {
  selectedRows.value = selection
}

function handleRowRightClick(row: any, column: any, event: MouseEvent) {
  event.preventDefault()
  rightClickedRow.value = row
  contextMenuX.value = event.clientX
  contextMenuY.value = event.clientY
  contextMenuVisible.value = true
  
  // 确保菜单在视窗内
  setTimeout(() => {
    const menu = document.querySelector('.context-menu') as HTMLElement
    if (menu) {
      const rect = menu.getBoundingClientRect()
      const viewportWidth = window.innerWidth
      const viewportHeight = window.innerHeight
      
      if (rect.right > viewportWidth) {
        contextMenuX.value = viewportWidth - rect.width - 5
      }
      if (rect.bottom > viewportHeight) {
        contextMenuY.value = viewportHeight - rect.height - 5
      }
    }
  }, 0)
}

function hideContextMenu() {
  contextMenuVisible.value = false
  rightClickedRow.value = null
}

function generateInsertStatement(row: any): string {
  const tableName = props.schemaName 
    ? `${quoteIdentifier(props.schemaName)}.${quoteIdentifier(props.pureName)}`
    : quoteIdentifier(props.pureName)
  
  const columns = Object.keys(row).filter(key => key !== 'key')
  const columnList = columns.map(col => quoteIdentifier(col)).join(', ')
  
  const values = columns.map(col => {
    const value = row[col]
    if (value === null || value === undefined) {
      return 'NULL'
    }
    if (typeof value === 'number') {
      return String(value)
    }
    if (typeof value === 'boolean') {
      return value ? '1' : '0'
    }
    // 字符串值需要转义
    return `'${String(value).replace(/'/g, "''")}'`
  }).join(', ')
  
  return `INSERT INTO ${tableName} (${columnList}) VALUES (${values});`
}

function handleCopyAsInsert() {
  hideContextMenu()
  
  const rowsToCopy = rightClickedRow.value ? [rightClickedRow.value] : selectedRows.value
  
  if (rowsToCopy.length === 0) {
    ElMessage.warning('请先选择要复制的行')
    return
  }
  
  const insertStatements = rowsToCopy.map(row => generateInsertStatement(row)).join('\n')
  
  navigator.clipboard.writeText(insertStatements).then(() => {
    ElMessage.success(`已复制 ${rowsToCopy.length} 行的Insert语句到剪贴板`)
  }).catch(() => {
    // 降级方案
    const textarea = document.createElement('textarea')
    textarea.value = insertStatements
    document.body.appendChild(textarea)
    textarea.select()
    document.execCommand('copy')
    document.body.removeChild(textarea)
    ElMessage.success(`已复制 ${rowsToCopy.length} 行的Insert语句到剪贴板`)
  })
}

// 点击其他地方隐藏菜单
document.addEventListener('click', (event) => {
  const contextMenu = document.querySelector('.context-menu')
  if (contextMenu && !contextMenu.contains(event.target as Node)) {
    hideContextMenu()
  }
})

// Cell editing functions
let currentEditingInput: HTMLInputElement | null = null

function setEditingInputRef(el: Element | null, rowIndex: number, columnIndex: number) {
  if (el && isCellEditing(rowIndex, columnIndex)) {
    currentEditingInput = el as HTMLInputElement
    // Focus and select after next tick
    setTimeout(() => {
      if (currentEditingInput) {
        currentEditingInput.focus()
        currentEditingInput.select()
      }
    }, 0)
  }
}

function isCellEditing(rowIndex: number, columnIndex: number): boolean {
  return editingCell.value?.rowIndex === rowIndex && editingCell.value?.columnIndex === columnIndex
}

function formatCellValue(value: any): string {
  if (value === null || value === undefined) {
    return 'NULL'
  }
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false'
  }
  return String(value)
}

function startCellEdit(rowIndex: number, columnIndex: number, value: any) {
  // If already editing another cell, cancel it first
  if (editingCell.value) {
    cancelCellEdit()
  }
  
  editingCell.value = {
    rowIndex,
    columnIndex,
    originalValue: value,
    currentValue: value === null || value === undefined ? '' : String(value)
  }
  
  // The focus will be handled by setEditingInputRef when the input is rendered
}

function cancelCellEdit() {
  editingCell.value = null
  currentEditingInput = null
}

async function saveCellEdit() {
  console.log('Saving cell edit...')
  if (!editingCell.value) return
    console.log('Saving cell edit2...')
  const { rowIndex, columnIndex, originalValue, currentValue } = editingCell.value
  const row = tableRows.value[rowIndex]
  const column = tableColumns.value[columnIndex]
  
  // Check if value actually changed
  if (currentValue === String(originalValue)) {
    cancelCellEdit()
    return
  }
  
  try {
    loading.value = true
    
    // Convert value to appropriate type
    let newValue: any = currentValue
    if (currentValue === '' || currentValue.toLowerCase() === 'null') {
      newValue = null
    } else if (currentValue.toLowerCase() === 'true') {
      newValue = true
    } else if (currentValue.toLowerCase() === 'false') {
      newValue = false
    } else {
      // Try to parse as number
      const num = Number(currentValue)
      if (!isNaN(num) && String(num) === currentValue) {
        newValue = num
      }
    }
    
    // Build UPDATE statement
    const tableName = props.schemaName 
      ? `${quoteIdentifier(props.schemaName)}.${quoteIdentifier(props.pureName)}`
      : quoteIdentifier(props.pureName)
    
    // Get primary key or use first column as identifier (simplified approach)
    const primaryKeyColumn = columnNames.value[0] || 'id'
    const primaryKeyValue = row[primaryKeyColumn]
    
    const setClause = `${quoteIdentifier(column.dataIndex)} = ${formatSqlValue(newValue)}`
    const whereClause = `${quoteIdentifier(primaryKeyColumn)} = ${formatSqlValue(primaryKeyValue)}`
    
    const updateSql = `UPDATE ${tableName} SET ${setClause} WHERE ${whereClause}`
    
    // Execute the update
    const result = await databaseConnectionsSqlSelectApi({
      conid: props.conid,
      database: props.database,
      select: { sql: updateSql }
    }) as any
    
    if (result?.errorMessage) {
      throw new Error(result.errorMessage)
    }
    
    // Update local data
    const updatedRows = [...rows.value]
    updatedRows[rowIndex] = { ...updatedRows[rowIndex], [column.dataIndex]: newValue }
    rows.value = updatedRows
    
    ElMessage.success('数据更新成功')
    cancelCellEdit()
    
  } catch (error: any) {
    ElMessage.error(`更新失败: ${error.message || '未知错误'}`)
  } finally {
    loading.value = false
  }
}

function formatSqlValue(value: any): string {
  if (value === null || value === undefined) {
    return 'NULL'
  }
  if (typeof value === 'number') {
    return String(value)
  }
  if (typeof value === 'boolean') {
    return value ? '1' : '0'
  }
  // String value - escape single quotes
  return `'${String(value).replace(/'/g, "''")}'`
}

watch(
  () => [props.conid, props.database, props.schemaName, props.pureName],
  () => {
    currentPage.value = 1
    loadTableStructure()
    loadData()
  }
)

onMounted(() => {
  loadTableStructure()
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

.context-menu {
  position: fixed;
  background: var(--el-bg-color-overlay);
  border: 1px solid var(--el-border-color-light);
  border-radius: 4px;
  box-shadow: var(--el-box-shadow-light);
  z-index: 3000;
  min-width: 160px;
  padding: 4px 0;
}

.context-menu-item {
  padding: 8px 12px;
  cursor: pointer;
  font-size: 14px;
  color: var(--el-text-color-regular);
  transition: all 0.2s;
}

.context-menu-item:hover {
  background: var(--el-fill-color-light);
  color: var(--el-color-primary);
}

.context-menu-item:active {
  background: var(--el-fill-color);
}

/* Cell editing styles */
.cell-container {
  padding: 4px 8px;
  cursor: pointer;
  min-height: 24px;
  display: flex;
  align-items: center;
  border-radius: 2px;
  transition: all 0.2s;
}

.cell-container:hover {
  background-color: var(--el-fill-color-light);
}

.cell-container.cell-editing {
  background-color: var(--el-color-primary-light-9);
  border: 2px solid var(--el-color-primary);
  padding: 2px 6px;
  outline: none;
}

.cell-input {
  width: 100%;
  border: none;
  outline: none;
  background: transparent;
  font-size: 14px;
  padding: 2px;
  color: var(--el-text-color-primary);
}

.cell-value {
  word-break: break-all;
}

.pagination-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.submit-edit-btn {
  transition: all 0.3s;
}

.submit-edit-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}
</style>
