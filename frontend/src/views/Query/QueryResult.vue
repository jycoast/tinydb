<template>
  <div
    class="query-result-wrap"
    style="flex: 0 0 38%; min-height: 200px; max-height: 50%; display: flex; flex-direction: column; border-top: 1px solid var(--theme-border);"
  >
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
            <el-button size="small" :icon="DocumentCopy" @click="emit('copy')">
              复制 (Ctrl+C)
            </el-button>
            <el-button size="small" @click="emit('copyAsInsert')">复制为 Insert 语句</el-button>
            <el-button size="small" @click="emit('clearSelection')">清除选择</el-button>
            <el-button size="small" :icon="Close" circle @click="emit('close')" title="关闭结果" />
          </el-space>
        </div>
      </template>
      <div
        ref="resultsHotkeyHostRef"
        tabindex="0"
        style="flex: 1; overflow: auto; padding: 12px; outline: none;"
        @mousedown="focusHost"
        @keydown="handleKeyDown"
      >
        <el-alert
          v-if="error"
          type="error"
          title="执行失败"
          :closable="true"
          show-icon
          @close="emit('clearError')"
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
          style="width: 100%"
          @row-click="(row: any) => emit('rowClick', row)"
          @selection-change="(sel: any[]) => emit('selectionChange', sel)"
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
                @click="emit('cellClick', row, column.property)"
                @dblclick="emit('startEditCell', row.key, column.property)"
              >
                <el-input
                  v-if="isEditingCell(row.key, column.property)"
                  :model-value="editingResultValue"
                  size="small"
                  autofocus
                  @update:model-value="emit('update:editingResultValue', $event)"
                  @blur="emit('commitEditCell', row.key, column.property)"
                  @keyup.enter="emit('commitEditCell', row.key, column.property)"
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
</template>

<script lang="ts" setup>
import { ref } from "vue"
import { DocumentCopy, Close } from "@element-plus/icons-vue"

export interface ResultTableColumn {
  key: string
  title: string
  dataIndex: string
  width?: number
  ellipsis?: boolean
}

const props = defineProps<{
  resultsInfo: string
  error: string
  queryResult: { rows: any[]; columns: Array<{ columnName: string }> } | null
  resultTableData: any[]
  tableColumns: ResultTableColumn[]
  resultsScrollY: number
  executing: boolean
  editingResultValue: string
  editingResultCell: { rowKey: string | number; dataIndex: string } | null
}>()

const emit = defineEmits<{
  close: []
  clearError: []
  copy: []
  copyAsInsert: []
  clearSelection: []
  rowClick: [row: any]
  selectionChange: [selection: any[]]
  cellClick: [row: any, property: string]
  startEditCell: [rowKey: string | number, dataIndex: string]
  commitEditCell: [rowKey: string | number, dataIndex: string]
  "update:editingResultValue": [value: string]
}>()

const resultsHotkeyHostRef = ref<HTMLElement | null>(null)

function focusHost() {
  resultsHotkeyHostRef.value?.focus?.()
}

function isEditingCell(rowKey: string | number, dataIndex: string): boolean {
  const c = props.editingResultCell
  return !!c && c.rowKey === rowKey && c.dataIndex === dataIndex
}

function handleKeyDown(e: KeyboardEvent) {
  if ((e.ctrlKey || e.metaKey) && (e.key === "c" || e.key === "C" || (e as any).keyCode === 67)) {
    e.preventDefault()
    emit("copy")
  }
}

defineExpose({ focusHost })
</script>

<style scoped>
.sql-error-pre {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
  font-size: 12px;
  line-height: 1.4;
}
</style>
