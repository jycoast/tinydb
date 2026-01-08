<template>
  <div class="ag-root">
    <div v-if="errorMessage" class="ag-error">{{ errorMessage }}</div>
    <div v-else class="ag-table-wrap" ref="wrap" @scroll.passive="handleScroll">
      <el-table
        border
        :data="dataSource"
        :loading="isLoading"
        size="default"
        :row-key="rowKey"
        @selection-change="handleSelectionChange"
        :row-class-name="rowClassName"
        style="width: 100%"
        height="100%"
      >
        <el-table-column type="selection" width="55" />
        <el-table-column
          v-for="col in elTableColumns"
          :key="col.prop"
          :prop="col.prop"
          :label="col.label"
          :show-overflow-tooltip="col.ellipsis"
          :min-width="120"
        >
          <template #default="{ row }">
            <div @dblclick="col.onDblclick(row)">
              <el-input
                v-if="col.isEditing(row)"
                v-model="editValue"
                size="small"
                autofocus
                @keyup.enter="saveEdit"
                @keyup.esc="cancelEdit"
                @blur="saveEdit"
              />
              <span v-else>{{ col.getCellValue(row) }}</span>
            </div>
          </template>
        </el-table-column>
      </el-table>
    </div>
    <!-- Bottom-left edit actions: commit / delete / insert / discard -->
    <div v-if="grider && grider.editable" class="ag-actions" @mousedown.stop @click.stop>
      <el-tooltip content="提交当前修改" placement="top">
        <el-button size="small" circle :disabled="!grider.allowSave" @click="handleCommitChanges">
          <el-icon><Check /></el-icon>
        </el-button>
      </el-tooltip>
      <el-tooltip content="删除选中的行" placement="top">
        <el-button size="small" circle :disabled="!hasSelectedRows" @click="handleDeleteSelectedRows">
          <el-icon><Minus /></el-icon>
        </el-button>
      </el-tooltip>
      <el-tooltip content="新增一行" placement="top">
        <el-button size="small" circle :disabled="!grider.canInsert" @click="handleInsertNewRow">
          <el-icon><Plus /></el-icon>
        </el-button>
      </el-tooltip>
      <el-tooltip content="放弃当前修改" placement="top">
        <el-button size="small" circle :disabled="!grider.containsChanges" @click="handleDiscardAllChanges">
          <el-icon><Close /></el-icon>
        </el-button>
      </el-tooltip>
    </div>
    <div class="ag-footer">
      <span v-if="allRowCount != null">Rows: {{ Number(allRowCount).toLocaleString() }}</span>
      <span v-if="selectedRowKeys.length" class="ag-selected">Selected: {{ selectedRowKeys.length }}</span>
      <span v-if="isLoading" class="ag-loading">Loading…</span>
      <span v-else-if="isLoadedAll" class="ag-loaded">Loaded</span>
    </div>
  </div>
</template>

<script lang="ts" setup>
import {computed, ref, toRefs, watch, watchEffect} from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Check, Close, Minus, Plus } from '@element-plus/icons-vue'
import type Grider from '/@/second/datagrid/Grider'
import type {GridDisplay} from '/@/second/tinydb-datalib'
import {databaseConnectionsSqlSelectApi} from '/@/api/simpleApis'

const props = defineProps<{
  grider?: Grider
  display?: GridDisplay
  conid?: string
  database?: string
  isLoading?: boolean
  isLoadedAll?: boolean
  allRowCount?: number
  errorMessage?: string | null
  selectedCellsPublished?: () => any[]
}>()

const emit = defineEmits<{
  (e: 'loadNextData'): void
  (e: 'update:selectedCellsPublished', v: () => any[]): void
}>()

const {grider, display, isLoading, isLoadedAll, errorMessage} = toRefs(props)

const wrap = ref<HTMLElement | null>(null)

const columns = computed(() => display.value?.getGridColumns?.() || [])

const selectedRowKeys = ref<Array<string | number>>([])

const firstColumnUniqueName = computed(() => {
  const c = columns.value?.[0] as any
  return c?.uniqueName || c?.columnName || null
})

const editingCell = ref<{row: number; col: string} | null>(null)
const editValue = ref<any>('')

const hasSelectedRows = computed(() => selectedRowKeys.value.length > 0)

const elTableColumns = computed(() => {
  return columns.value.map((c: any) => ({
    prop: c.uniqueName,
    label: c.headerText || c.columnName || c.uniqueName,
    ellipsis: true,
    uniqueName: c.uniqueName,
    isEditing: (row: any) => {
      const idx = row?.__rowIndex
      return !!editingCell.value && editingCell.value.row === idx && editingCell.value.col === c.uniqueName
    },
    getCellValue: (row: any) => {
      const idx = row?.__rowIndex
      if (!grider.value || idx == null) return ''
      const rowData = grider.value.getRowData(idx)
      const v = rowData ? rowData[c.uniqueName] : undefined
      return v == null ? '' : String(v)
    },
    onDblclick: (row: any) => {
      const idx = row?.__rowIndex
      if (idx != null) startEdit(idx, c.uniqueName)
    },
  }))
})

const dataSource = computed(() => {
  const g = grider.value
  if (!g) return []
  const cnt = g.rowCount
  return Array.from({length: cnt}, (_, i) => ({__rowIndex: i}))
})

const rowKey = (r: any) => String(r?.__rowIndex ?? '')

function handleSelectionChange(selection: any[]) {
  selectedRowKeys.value = selection.map((r: any) => String(r?.__rowIndex ?? ''))
}

const rowClassName = (record: any) => {
  const idx = record?.__rowIndex
  if (!grider.value || idx == null) return ''
  const status = grider.value.getRowStatus?.(idx)?.status
  return status ? `ag-row-${status}` : ''
}

function publishSelection() {
  const col = firstColumnUniqueName.value
  if (!grider.value || !col) {
    emit('update:selectedCellsPublished', () => [])
    return
  }
  const engine = display.value?.driver
  const rows = selectedRowKeys.value
    .map((k) => Number(k))
    .filter((n) => Number.isFinite(n))
    .map((row) => {
      const rowData = grider.value!.getRowData(row)
      return {
        row,
        rowData,
        column: col,
        value: rowData && rowData[col],
        engine,
      }
    })
  emit('update:selectedCellsPublished', () => rows)
}

watch(selectedRowKeys, () => publishSelection(), {deep: true})
watch([grider, columns], () => publishSelection())

// Initial load: the legacy DataGridCore triggers loadNextData immediately (because rowCount==0 satisfies its watcher).
// Ant Table doesn't emit anything until scroll happens, so we need to trigger the first page load explicitly.
const initialLoadRequested = ref(false)
watchEffect(() => {
  if (!grider.value) {
    return
  }
  if (errorMessage?.value) {
    return
  }
  if (isLoading?.value) {
    return
  }
  if (isLoadedAll?.value) {
    return
  }
  if (initialLoadRequested.value) {
    return
  }
  if (grider.value.rowCount === 0) {
    initialLoadRequested.value = true
    emit('loadNextData')
  }
})

watch([display, columns], () => {
  initialLoadRequested.value = false
})

function startEdit(row: number, col: string) {
  if (!grider.value?.editable) return
  if (row == null || col == null) return
  const st = grider.value.getRowStatus?.(row)?.status
  if (st === 'deleted') return
  const rowData = grider.value.getRowData(row)
  editingCell.value = {row, col}
  editValue.value = rowData ? rowData[col] : ''
}

function cancelEdit() {
  editingCell.value = null
  editValue.value = ''
}

function coerceValue(raw: any, oldValue: any) {
  // Keep empty string as-is; we can't reliably infer DB nullability here.
  if (typeof oldValue === 'number') {
    const n = Number(raw)
    return Number.isFinite(n) ? n : raw
  }
  if (typeof oldValue === 'boolean') {
    const s = String(raw).toLowerCase().trim()
    if (s === '1' || s === 'true') return true
    if (s === '0' || s === 'false') return false
    return raw
  }
  return raw
}

function saveEdit() {
  if (!editingCell.value || !grider.value) return
  const {row, col} = editingCell.value
  const rowData = grider.value.getRowData(row)
  const oldValue = rowData ? rowData[col] : undefined
  const newValue = coerceValue(editValue.value, oldValue)
  if (newValue !== oldValue) {
    grider.value.setCellValue?.(row, col, newValue)
  }
  cancelEdit()
}

function handleScroll() {
  // Ant Table virtual scroll container is inside .ag-table-wrap, so listen here.
  if (!wrap.value) return
  if (isLoading?.value) return
  if (isLoadedAll?.value) return
  const el = wrap.value
  const remaining = el.scrollHeight - (el.scrollTop + el.clientHeight)
  if (remaining < 240) {
    emit('loadNextData')
  }
}

function quoteIdent(name: string) {
  if (!name || (typeof name === 'string' && name.trim() === '')) return ''
  const safe = String(name).replace(/`/g, '``')
  return `\`${safe}\``
}

function sqlLiteral(value: any): string {
  if (value === null || value === undefined) return 'NULL'
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  if (typeof value === 'boolean') return value ? '1' : '0'
  if (value instanceof Date) return `'${value.toISOString().slice(0, 19).replace('T', ' ')}'`
  if (typeof value === 'object') {
    const json = JSON.stringify(value)
    return `'${(json || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`
  }
  const s = String(value)
  return `'${s.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`
}

function buildWhere(condition: Record<string, any> | null | undefined) {
  if (!condition || Object.keys(condition).length === 0) return ''
  const parts = Object.entries(condition).map(([k, v]) => {
    if (v === null || v === undefined) return `${quoteIdent(k)} IS NULL`
    return `${quoteIdent(k)} = ${sqlLiteral(v)}`
  })
  return parts.length ? ` WHERE ${parts.join(' AND ')}` : ''
}

async function handleCommitChanges() {
  if (!grider.value?.allowSave) return
  if (!props.conid || !props.database) return

      const base = display.value?.baseTableOrSimilar as any
      if (!base?.pureName) {
        ElMessage.error('无法提交：未识别当前表')
        return
      }

      const tableName = base.schemaName
        ? `${quoteIdent(base.schemaName)}.${quoteIdent(base.pureName)}`
        : `${quoteIdent(base.pureName)}`

      const cs = (grider.value as any)?.changeSet
      if (!cs) {
        ElMessage.error('无法提交：缺少变更集')
        return
      }

  const statements: string[] = []
  for (const item of cs.deletes || []) {
    const where = buildWhere(item.condition)
    if (where) statements.push(`DELETE FROM ${tableName}${where};`)
  }
  for (const item of cs.updates || []) {
    const fields = item.fields || {}
    const sets = Object.entries(fields)
      .filter(([k]) => !!k)
      .map(([k, v]) => `${quoteIdent(k)} = ${sqlLiteral(v)}`)
    const where = buildWhere(item.condition)
    if (sets.length && where) statements.push(`UPDATE ${tableName} SET ${sets.join(', ')}${where};`)
  }
  for (const item of cs.inserts || []) {
    const fields = item.fields || {}
    const cols = Object.keys(fields).filter(Boolean)
    if (!cols.length) continue
    const colSql = cols.map(quoteIdent).join(', ')
    const valSql = cols.map((k) => sqlLiteral(fields[k])).join(', ')
    statements.push(`INSERT INTO ${tableName} (${colSql}) VALUES (${valSql});`)
  }

      if (!statements.length) {
        ElMessage.info('没有可提交的修改（请先修改/新增/删除）')
        return
      }

      ElMessageBox.confirm(
        `确定要提交 ${statements.length} 条变更吗？`,
        '提交修改',
        {
          confirmButtonText: '提交',
          cancelButtonText: '取消',
          type: 'warning',
        }
      ).then(async () => {
        try {
          for (const sql of statements) {
            const res = await databaseConnectionsSqlSelectApi({
              conid: props.conid!,
              database: props.database!,
              select: {sql},
            })
            if ((res as any)?.errorMessage) throw new Error(String((res as any).errorMessage))
          }
          grider.value?.revertAllChanges?.()
          display.value?.reload?.()
          ElMessage.success('提交成功')
        } catch (e: any) {
          ElMessage.error(e?.message || '提交失败')
        }
      }).catch(() => {
        // 用户取消
      })
}

function handleDiscardAllChanges() {
  if (!grider.value?.containsChanges) return
  ElMessageBox.confirm(
    '确定要放弃当前所有未提交的修改吗？',
    '放弃修改',
    {
      confirmButtonText: '放弃',
      cancelButtonText: '取消',
      type: 'warning',
    }
  ).then(() => {
    grider.value?.revertAllChanges?.()
    ElMessage.success('已放弃修改')
  }).catch(() => {
    // 用户取消
  })
}

function handleDeleteSelectedRows() {
  if (!grider.value?.editable) return
  const rows = selectedRowKeys.value.map((k) => Number(k)).filter((n) => Number.isFinite(n)) as number[]
  if (!rows.length) return
  ElMessageBox.confirm(
    `确定要标记删除选中的 ${rows.length} 行吗？（点击对勾提交后才会写入数据库）`,
    '删除行',
    {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning',
    }
  ).then(() => {
    grider.value?.beginUpdate?.()
    // delete from bottom to top to reduce index shifting surprises
    for (const r of [...rows].sort((a, b) => b - a)) grider.value?.deleteRow?.(r)
    grider.value?.endUpdate?.()
    ElMessage.success('已标记删除')
  }).catch(() => {
    // 用户取消
  })
}

function handleInsertNewRow() {
  if (!grider.value?.canInsert) return
  const newRow = grider.value.insertRow()
  if (newRow == null) return
  selectedRowKeys.value = [String(newRow)]
  // scroll to bottom (best-effort)
  if (wrap.value) {
    wrap.value.scrollTop = wrap.value.scrollHeight
  }
    if (firstColumnUniqueName.value) startEdit(newRow, firstColumnUniqueName.value)
    ElMessage.success('已新增一行（双击单元格编辑，点击对勾提交）')
}
</script>

<style scoped>
.ag-root {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  min-height: 0;
  min-width: 0;
  background: var(--theme-bg-0);
}

.ag-table-wrap {
  flex: 1;
  min-height: 0;
  overflow: auto;
}

.ag-footer {
  flex: 0 0 22px;
  height: 22px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 8px;
  border-top: 1px solid var(--theme-border);
  color: var(--theme-font-3);
  background: var(--theme-bg-1);
}

.ag-actions {
  position: absolute;
  left: 10px;
  bottom: 26px; /* above footer */
  display: flex;
  gap: 6px;
  z-index: 5;
}

.ag-selected {
  color: var(--theme-font-2);
}

.ag-error {
  padding: 8px;
  color: #cf1322;
}

.ag-loading {
  color: var(--theme-font-2);
}

.ag-loaded {
  color: var(--theme-font-3);
}

.ag-root :deep(.el-table) {
  height: 100%;
}

.ag-root :deep(.el-table__body-wrapper) {
  max-height: 100% !important;
}

.ag-root :deep(.el-table__row.ag-row-deleted) {
  opacity: 0.55;
  text-decoration: line-through;
}

.ag-root :deep(.el-table__row.ag-row-updated) {
  background: rgba(250, 173, 20, 0.10);
}

.ag-root :deep(.el-table__row.ag-row-inserted) {
  background: rgba(82, 196, 26, 0.10);
}
</style>


