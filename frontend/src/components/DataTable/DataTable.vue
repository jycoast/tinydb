<template>
  <div class="data-table-wrapper" :style="{ height: '100%', maxHeight: maxHeight }">
    <div v-if="data.length === 0" class="data-table-empty">
      <slot name="empty">
        <span>{{ emptyText }}</span>
      </slot>
    </div>
    <div
      v-else
      ref="tableContainerRef"
      class="data-table-container"
    >
      <div
        class="data-table-scroll"
        :style="{
          height: totalSize + 'px',
          width: tableWidthPx,
        }"
      >
        <table
          class="data-table"
          :style="{ width: tableWidthPx }"
        >
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
              <span class="data-table-th-content">
                <template v-if="header.column.id === 'select'">
                  <el-checkbox
                    :model-value="table.getIsAllRowsSelected()"
                    :indeterminate="table.getIsSomeRowsSelected()"
                    @update:model-value="
                      (val) =>
                        table.getToggleAllRowsSelectedHandler()?.({ target: { checked: val } })
                    "
                  />
                </template>
                <template v-else>
                  {{ header.column.columnDef.header as string }}
                </template>
              </span>
              <div
                v-if="header.column.getCanResize()"
                class="data-table-resize-handle"
                @mousedown="onResizeStart(header, $event)"
                @touchstart="onResizeStart(header, $event)"
                @click.stop
              ></div>
            </th>
          </tr>
        </thead>
        <tbody
          class="data-table-body"
          :style="{ height: totalSize + 'px', position: 'relative' }"
          @click="emit('body-click')"
        >
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
                  @update:model-value="
                    (val) =>
                      rows[vRow.index].getToggleSelectedHandler()?.({ target: { checked: val } })
                  "
                  @click.stop
                />
              </template>
              <template v-else>
                <div class="data-table-cell-inner">
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
                </div>
              </template>
            </td>
          </tr>
        </tbody>
      </table>
      </div>
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
    (e: 'body-click'): void;
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
        maxSize: 800,
        enableResizing: true,
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
    enableColumnResizing: true,
    columnResizeMode: 'onEnd',
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

  const tableWidth = computed(() => {
    const headerGroups = table.getHeaderGroups();
    if (!headerGroups.length) return 0;
    return headerGroups[0].headers.reduce((sum, h) => sum + h.getSize(), 0);
  });

  const tableWidthPx = computed(() => {
    const w = tableWidth.value;
    return w > 0 ? w + 'px' : '100%';
  });

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

  function onResizeStart(
    header: { getResizeHandler: () => (e: MouseEvent | TouchEvent) => void },
    e: MouseEvent | TouchEvent,
  ) {
    e.preventDefault();
    e.stopPropagation();
    header.getResizeHandler()(e);
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
  .data-table-wrapper {
    flex: 1;
    min-height: 0;
    min-width: 0;
    width: 100%;
    display: flex;
    flex-direction: column;
    border: 1px solid var(--el-border-color);
    border-radius: 4px;
    background: var(--el-bg-color);
    overflow: hidden;
  }

  .data-table-container {
    flex: 1;
    min-height: 0;
    min-width: 0;
    overflow: auto;
    position: relative;
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
    display: inline-block;
  }

  .data-table {
    display: grid;
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
    position: relative;
    padding: 8px 12px;
    user-select: none;
    font-size: 12px;
    font-weight: 600;
    color: var(--el-text-color-primary);
    border-bottom: 1px solid var(--el-border-color);
    border-right: 1px solid var(--el-border-color-lighter);
    box-sizing: border-box;
    flex-shrink: 0;
  }

  .data-table-th:last-child {
    border-right: none;
  }

  .data-table-th-content {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .data-table-resize-handle {
    position: absolute;
    top: 0;
    right: 0;
    width: 8px;
    height: 100%;
    cursor: col-resize;
    user-select: none;
    -webkit-user-select: none;
  }

  .data-table-resize-handle:hover {
    background: var(--el-color-primary-light-7);
  }

  .data-table-resize-handle::after {
    content: '';
    position: absolute;
    top: 50%;
    right: 2px;
    transform: translateY(-50%);
    width: 2px;
    height: 16px;
    border-radius: 1px;
    background: var(--el-border-color);
  }

  .data-table-resize-handle:hover::after {
    background: var(--el-color-primary);
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
    height: 36px;
    border-bottom: 1px solid var(--el-border-color-lighter);
    box-sizing: border-box;
  }

  .data-table-row--striped {
    background: var(--el-fill-color-lighter);
  }

  .data-table-td {
    display: flex;
    align-items: center;
    height: 36px;
    padding: 0 12px;
    font-size: 13px;
    color: var(--el-text-color-regular);
    border-bottom: 1px solid var(--el-border-color-lighter);
    border-right: 1px solid var(--el-border-color-lighter);
    box-sizing: border-box;
    flex-shrink: 0;
    min-width: 0;
    overflow: hidden;
  }

  .data-table-td:last-child {
    border-right: none;
  }

  .data-table-td--selected {
    background-color: var(--el-color-primary-light-9);
  }

  .data-table-cell-inner {
    width: 100%;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    line-height: 36px;
  }

  .data-table-cell-text {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    word-break: break-all;
  }
</style>
