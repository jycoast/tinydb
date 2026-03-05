import type { TreeNode, NodeHandlerContext, ContextMenuItem } from '../types';

const DATABASE_MENU_ITEMS: { text: string; command: string; divider?: boolean }[] = [
  { text: '新建查询', command: 'db-new-query' },
  { text: '新建表', command: 'db-create-table' },
  { text: '新建集合', command: '' },
  { text: '导入向导', command: '' },
  { text: '导出向导', command: '' },
  { text: '恢复/导入 SQL 转储', command: '' },
  { text: '备份/导出 SQL 转储', command: '' },
  { text: '', command: '', divider: true },
  { text: '关闭数据库', command: 'db-close-database' },
];

export function getIcon(data: TreeNode, ctx: NodeHandlerContext): string {
  if (data.conid && ctx.openedConnections.value.includes(data.conid))
    return ctx.icons.databaseConnectedIcon;
  return ctx.icons.databaseIcon;
}

export async function onClick(data: TreeNode, node: any, ctx: NodeHandlerContext): Promise<void> {
  if (!data.conid || !data.database) return;
  const key = `${data.conid}::${data.database}`;
  const isExpanded = ctx.expandedConnections.value.includes(key);
  if (!isExpanded) {
    ctx.bootstrap.updateExpandedConnections((old: string[]) => [...old, key]);
    try {
      await ctx.serverConnectionsRefreshApi({ conid: data.conid, keepOpen: true });
      await ctx.databaseConnectionsRefreshApi({
        conid: data.conid,
        database: data.database,
        keepOpen: true,
      });
      if (data.children && data.children.length > 0) {
        const tablesCategory = data.children.find((c: TreeNode) => c.type === 'tables');
        if (tablesCategory) {
          await ctx.loadCategoryObjects(tablesCategory);
          await ctx.nextTick();
        }
      }
    } catch (e) {
      console.error('刷新数据库结构失败', e);
    }
    node.expanded = true;
  } else {
    ctx.bootstrap.updateExpandedConnections((old: string[]) => old.filter((id) => id !== key));
    node.expanded = false;
  }
}

export function getContextMenuItems(data: TreeNode, _ctx: NodeHandlerContext): ContextMenuItem[] {
  return DATABASE_MENU_ITEMS.map((item) => ({
    label: item.text,
    command: item.command || undefined,
    divider: item.divider,
  }));
}
