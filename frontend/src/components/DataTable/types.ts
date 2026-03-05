export interface DataTableColumn {
  title: string;
  dataIndex: string;
  key?: string;
  width?: number;
}

export interface DataTableProps {
  columns: DataTableColumn[];
  data: Record<string, unknown>[];
  rowKey?: string;
  selectable?: boolean;
  selectedColumnId?: string | null;
  maxHeight?: string;
  emptyText?: string;
}

export interface DataTableEmits {
  (e: 'selection-change', rows: Record<string, unknown>[]): void;
  (e: 'row-contextmenu', row: Record<string, unknown>, event: MouseEvent): void;
  (e: 'header-click', columnId: string): void;
}

export interface DataTableCellSlotProps {
  row: Record<string, unknown>;
  column: DataTableColumn;
  rowIndex: number;
  columnIndex: number;
  value: unknown;
}
