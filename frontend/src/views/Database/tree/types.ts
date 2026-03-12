import type { Ref } from 'vue';
import type { IActiveConnection } from '/@/types/connections';

export interface TreeNode {
  id: string;
  label: string;
  type:
    | 'connection'
    | 'database'
    | 'tables'
    | 'views'
    | 'functions'
    | 'table'
    | 'view'
    | 'function'
    | 'column'
    | 'object';
  conid?: string;
  database?: string;
  category?: string;
  objectType?: string;
  extInfo?: string;
  statusIcon?: string;
  statusTitle?: string;
  children?: TreeNode[];
  rawData?: any;
  schemaName?: string;
  pureName?: string;
  loading?: boolean;
}

export interface ContextMenuItem {
  label: string;
  command?: string;
  divider?: boolean;
  disabled?: boolean;
}

export interface TreeIcons {
  connectionIcon: string;
  connectionConnectedIcon: string;
  databaseIcon: string;
  databaseConnectedIcon: string;
  tableIcon: string;
  functionIcon: string;
  viewIcon: string;
  columnsIcon: string;
}

export interface NodeHandlerContext {
  treeData: Ref<TreeNode[]>;
  treeRef: Ref<any>;
  props: { connectionsWithStatus: IActiveConnection[]; loading: boolean; searchKeyword?: string };
  emit: (e: string, ...args: any[]) => void;
  bootstrap: any;
  expandedConnections: Ref<string[]>;
  openedConnections: Ref<string[]>;
  openedDatabases: Ref<string[]>;
  disconnectingConid: Ref<string | null>;
  nextTick: (fn?: () => void) => Promise<void>;
  loadDatabasesForConnection: (connectionNode: TreeNode, conn: IActiveConnection) => Promise<void>;
  loadCategoryObjects: (node: TreeNode) => Promise<void>;
  loadTableColumns: (tableNode: TreeNode) => Promise<void>;
  serverConnectionsRefreshApi: (opts: { conid: string; keepOpen: boolean }) => Promise<any>;
  databaseConnectionsRefreshApi: (opts: {
    conid: string;
    database: string;
    keepOpen: boolean;
  }) => Promise<any>;
  getDatabaseInfo: (opts: { conid: string; database: string }) => Promise<any>;
  getConnectionLabel: (conn: any) => string;
  structureCache: Ref<Record<string, any>>;
  icons: TreeIcons;
  safeSetExpand?: (key: string, value: boolean) => void;
}

export interface NodeTypeHandler {
  getIcon?(data: TreeNode, ctx: NodeHandlerContext): string | null;
  onClick?(data: TreeNode, node: any, ctx: NodeHandlerContext): void | Promise<void>;
  onDblClick?(data: TreeNode, ctx: NodeHandlerContext): void;
  onExpand?(data: TreeNode, ctx: NodeHandlerContext): void | Promise<void>;
  getContextMenuItems?(data: TreeNode, ctx: NodeHandlerContext): ContextMenuItem[];
}
