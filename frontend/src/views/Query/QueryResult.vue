<template>
  <div
    class="query-result-wrap"
    style="
      height: 100%;
      min-height: 0;
      display: flex;
      flex-direction: column;
    "
  >
    <el-card
      shadow="never"
      style="flex: 1; display: flex; flex-direction: column; overflow: hidden"
      :body-style="{
        padding: 0,
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }"
    >
      <template #header>
        <div style="display: flex; justify-content: space-between; align-items: center">
          <div>
            <span>查询结果</span>
            <span v-if="resultsInfo" style="font-size: 12px; color: #909399; margin-left: 8px">
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
        style="flex: 1; overflow: auto; padding: 12px; outline: none"
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

        <div
          v-else-if="queryResult && resultTableData.length > 0"
          v-loading="executing"
          style="flex: 1; min-height: 0; display: flex"
        >
          <DataTable
            :columns="dataTableColumns"
            :data="resultTableData"
            row-key="__rowKey"
            :selectable="false"
            :max-height="resultsScrollY + 'px'"
            empty-text="查询成功，但没有返回数据"
            @selection-change="(rows) => emit('selectionChange', rows)"
            @body-click="emit('rowClick', null)"
          >
            <template #cell="{ row, column, value }">
              <div
                v-if="column"
                class="query-result-cell"
                @click.stop="onCellClick(row, column)"
                @dblclick="emit('startEditCell', rowKeyOf(row), column.dataIndex)"
              >
                <el-input
                  v-if="isEditingCell(rowKeyOf(row), column.dataIndex)"
                  :model-value="editingResultValue"
                  size="small"
                  autofocus
                  @update:model-value="emit('update:editingResultValue', $event)"
                  @blur="emit('commitEditCell', rowKeyOf(row), column.dataIndex)"
                  @keyup.enter="emit('commitEditCell', rowKeyOf(row), column.dataIndex)"
                  @click.stop
                />
                <span v-else class="query-result-cell-text">{{ formatCellValue(value) }}</span>
              </div>
            </template>
          </DataTable>
        </div>

        <el-empty
          v-else-if="queryResult && resultTableData.length === 0"
          description="查询成功，但没有返回数据"
        />
      </div>
    </el-card>
  </div>
</template>

<script lang="ts" setup>
  import { ref, computed } from 'vue';
  import { DocumentCopy, Close } from '@element-plus/icons-vue';
  import DataTable from '/@/components/DataTable/DataTable.vue';

  export interface ResultTableColumn {
    key: string;
    title: string;
    dataIndex: string;
    width?: number;
    ellipsis?: boolean;
  }

  const props = defineProps<{
    resultsInfo: string;
    error: string;
    queryResult: { rows: any[]; columns: Array<{ columnName: string }> } | null;
    resultTableData: any[];
    tableColumns: ResultTableColumn[];
    resultsScrollY: number;
    executing: boolean;
    editingResultValue: string;
    editingResultCell: { rowKey: string | number; dataIndex: string } | null;
  }>();

  const emit = defineEmits<{
    close: [];
    clearError: [];
    copy: [];
    copyAsInsert: [];
    clearSelection: [];
    rowClick: [row: any | null];
    selectionChange: [selection: any[]];
    cellClick: [row: any, property: string];
    startEditCell: [rowKey: string | number, dataIndex: string];
    commitEditCell: [rowKey: string | number, dataIndex: string];
    'update:editingResultValue': [value: string];
  }>();

  const resultsHotkeyHostRef = ref<HTMLElement | null>(null);

  const dataTableColumns = computed(() =>
    props.tableColumns.map((c) => ({
      title: c.title,
      dataIndex: c.dataIndex,
      width: c.width ?? 160,
    })),
  );

  function rowKeyOf(row: Record<string, unknown>): string | number {
    const k = row.__rowKey;
    return typeof k === 'number' || typeof k === 'string' ? k : 0;
  }

  function onCellClick(row: Record<string, unknown>, column: { dataIndex: string }) {
    emit('cellClick', row, column.dataIndex);
    emit('rowClick', row);
  }

  function formatCellValue(value: unknown): string {
    if (value === null || value === undefined) return 'NULL';
    return String(value);
  }

  function focusHost() {
    resultsHotkeyHostRef.value?.focus?.();
  }

  function isEditingCell(rowKey: string | number, dataIndex: string): boolean {
    const c = props.editingResultCell;
    return !!c && c.rowKey === rowKey && c.dataIndex === dataIndex;
  }

  function handleKeyDown(e: KeyboardEvent) {
    if ((e.ctrlKey || e.metaKey) && (e.key === 'c' || e.key === 'C' || (e as any).keyCode === 67)) {
      e.preventDefault();
      emit('copy');
    }
  }

  defineExpose({ focusHost });
</script>

<style scoped>
  .sql-error-pre {
    margin: 0;
    white-space: pre-wrap;
    word-break: break-word;
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono',
      'Courier New', monospace;
    font-size: 12px;
    line-height: 1.4;
  }

  .query-result-cell {
    width: 100%;
    min-width: 0;
    overflow: hidden;
  }

  .query-result-cell-text {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    display: block;
  }
</style>
