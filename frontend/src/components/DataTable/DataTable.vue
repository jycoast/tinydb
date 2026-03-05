<template>
  <div ref="tableContainerRef" class="data-table-container" :style="{ maxHeight: maxHeight }">
    <div v-if="data.length === 0" class="data-table-empty">
      <slot name="empty">
        <span>{{ emptyText }}</span>
      </slot>
    </div>
    <div v-else class="data-table-scroll" :style="{ height: totalSize + 'px' }">
      <table class="data-table">
        <thead class="data-table-head">
          <tr
            v-for="headerGroup in table.getHeaderGroups()"
            :key="headerGroup.id"
            class="data-table-head-row"
          >
            <th
              v-for="header in headerGroup.headers"
              :key="header.id"
              class="data-table-th"
              :class="{
                'data-table-th--selected':
                  selectedColumnId && header.column.id === selectedColumnId,
              }"
              :style="{ width: header.getSize() + 'px', minWidth: header.getSize() + 'px' }"
              @click="onHeaderClick(header)"
            >
              <template v-if="header.column.id === 'select'">
                <el-checkbox
                  :model-value="table.getIsAllRowsSelected()"
                  :indeterminate="table.getIsSomeRowsSelected()"
                  @update:model-value="table.getToggleAllRowsSelectedHandler()?.($event)"
                />
              </template>
              <template v-else>
                {{ header.column.columnDef.header as string }}
              </template>
            </th>
          </tr>
        </thead>
        <tbody class="data-table-body" :style="{ height: totalSize + 'px', position: 'relative' }">
          <tr
            v-for="vRow in virtualRows"
            :key="rows[vRow.index]?.id"
            class="data-table-row"
            :class="{ 'data-table-row--striped': vRow.index % 2 === 1 }"
            :data-index="vRow.index"
            :ref="(el) => measureElement(el as Element | null)"
            :style="{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              transform: `translateY(${vRow.start}px)`,
            }"
          >
            <td
              v-for="cell in rows[vRow.index].getVisibleCells()"
              :key="cell.id"
              class="data-table-td"
              :class="{
                'data-table-td--selected': selectedColumnId && cell.column.id === selectedColumnId,
              }"
              :style="{
                width: cell.column.getSize() + 'px',
                minWidth: cell.column.getSize() + 'px',
              }"
              @contextmenu="onCellContextmenu(rows[vRow.index].original, $event)"
            >
              <template v-if="cell.column.id === 'select'">
                <el-checkbox
                  :model-value="rows[vRow.index].getIsSelected()"
                  @update:model-value="rows[vRow.index].getToggleSelectedHandler()?.($event)"
                  @click.stop
                />
              </template>
              <template v-else>
                <slot
                  name="cell"
                  :row="rows[vRow.index].original"
                  :column="getColumnById(cell.column.id)"
                  :row-index="vRow.index"
                  :column-index="getDataColumnIndex(cell.column.id)"
                  :value="cell.getValue()"
                >
                  <span class="data-table-cell-text">{{ formatCellValue(cell.getValue()) }}</span>
                </slot>
              </template>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script lang="ts" setup>
  import { ref, computed, watch } from 'vue';
  import { useVueTable, getCoreRowModel, type ColumnDef } from '@tanstack/vue-table';
  import { useVirtualizer } from '@tanstack/vue-virtual';
  import type { DataTableColumn } from './types';

  const props = withDefaults(
    defineProps<{
      columns: DataTableColumn[];
      data: Record<string, unknown>[];
      rowKey?: string;
      selectable?: boolean;
      selectedColumnId?: string | null;
      maxHeight?: string;
      emptyText?: string;
    }>(),
    {
      rowKey: 'key',
      selectable: true,
      selectedColumnId: null,
      maxHeight: 'calc(100vh - 220px)',
      emptyText: '暂无数据',
    },
  );

  const emit = defineEmits<{
    (e: 'selection-change', rows: Record<string, unknown>[]): void;
    (e: 'row-contextmenu', row: Record<string, unknown>, event: MouseEvent): void;
    (e: 'header-click', columnId: string): void;
  }>();

  const rowSelection = ref<Record<string, boolean>>({});
  const tableContainerRef = ref<HTMLDivElement | null>(null);

  const columnDefs = computed<ColumnDef<Record<string, unknown>>[]>(() => {
    const defs: ColumnDef<Record<string, unknown>>[] = [];
    if (props.selectable) {
      defs.push({
        id: 'select',
        header: '',
        size: 55,
        minSize: 55,
        maxSize: 55,
        enableResizing: false,
        cell: () => null,
      });
    }
    for (const col of props.columns) {
      defs.push({
        id: col.dataIndex,
        accessorKey: col.dataIndex,
        header: col.title,
        size: col.width ?? 140,
        minSize: 60,
        cell: () => null,
      });
    }
    return defs;
  });

  const table = useVueTable({
    get data() {
      return props.data;
    },
    get columns() {
      return columnDefs.value;
    },
    getRowId: (row) => String(row[props.rowKey] ?? Math.random()),
    getCoreRowModel: getCoreRowModel(),
    enableRowSelection: props.selectable,
    state: {
      get rowSelection() {
        return rowSelection.value;
      },
    },
    onRowSelectionChange: (updater) => {
      rowSelection.value = typeof updater === 'function' ? updater(rowSelection.value) : updater;
    },
  });

  const rows = computed(() => table.getRowModel().rows);

  const rowVirtualizerOptions = computed(() => ({
    count: rows.value.length,
    estimateSize: () => 36,
    getScrollElement: () => tableContainerRef.value,
    overscan: 10,
  }));

  const rowVirtualizer = useVirtualizer(rowVirtualizerOptions);

  const virtualRows = computed(() => rowVirtualizer.value.getVirtualItems());
  const totalSize = computed(() => rowVirtualizer.value.getTotalSize());

  watch(
    rowSelection,
    () => {
      emit(
        'selection-change',
        table.getSelectedRowModel().rows.map((r) => r.original),
      );
    },
    { deep: true },
  );

  function measureElement(el: Element | null) {
    if (el) rowVirtualizer.value.measureElement(el);
  }

  function getColumnById(id: string): DataTableColumn | undefined {
    return props.columns.find((c) => c.dataIndex === id);
  }

  function getDataColumnIndex(columnId: string): number {
    const idx = props.columns.findIndex((c) => c.dataIndex === columnId);
    return idx >= 0 ? idx : 0;
  }

  function onHeaderClick(header: { column: { id: string; getCanSort?: () => boolean } }) {
    if (header.column.id === 'select') return;
    emit('header-click', header.column.id);
  }

  function onCellContextmenu(row: Record<string, unknown>, event: MouseEvent) {
    event.preventDefault();
    emit('row-contextmenu', row, event);
  }

  function formatCellValue(value: unknown): string {
    if (value === null || value === undefined) return 'NULL';
    if (typeof value === 'boolean') return value ? 'true' : 'false';
    return String(value);
  }
</script>

<style scoped>
  .data-table-container {
    overflow: auto;
    position: relative;
    border: 1px solid var(--el-border-color);
    border-radius: 4px;
    background: var(--el-bg-color);
  }

  .data-table-empty {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 120px;
    color: var(--el-text-color-secondary);
    font-size: 14px;
  }

  .data-table-scroll {
    position: relative;
    width: 100%;
  }

  .data-table {
    display: grid;
    width: 100%;
    border-collapse: collapse;
    table-layout: fixed;
  }

  .data-table-head {
    display: grid;
    position: sticky;
    top: 0;
    z-index: 1;
    background: var(--el-fill-color-light);
  }

  .data-table-head-row {
    display: flex;
    width: 100%;
  }

  .data-table-th {
    display: flex;
    align-items: center;
    padding: 8px 12px;
    font-size: 12px;
    font-weight: 600;
    color: var(--el-text-color-primary);
    border-bottom: 1px solid var(--el-border-color);
    box-sizing: border-box;
    flex-shrink: 0;
  }

  .data-table-th--selected {
    background-color: var(--el-color-primary-light-9);
  }

  .data-table-body {
    display: grid;
    position: relative;
    width: 100%;
  }

  .data-table-row {
    display: flex;
    width: 100%;
    border-bottom: 1px solid var(--el-border-color-lighter);
  }

  .data-table-row--striped {
    background: var(--el-fill-color-lighter);
  }

  .data-table-td {
    display: flex;
    align-items: center;
    padding: 4px 12px;
    font-size: 13px;
    color: var(--el-text-color-regular);
    border-bottom: 1px solid var(--el-border-color-lighter);
    box-sizing: border-box;
    flex-shrink: 0;
    overflow: hidden;
  }

  .data-table-td--selected {
    background-color: var(--el-color-primary-light-9);
  }

  .data-table-cell-text {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    word-break: break-all;
  }
</style>
