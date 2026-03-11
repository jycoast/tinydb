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
  if (!data.conid || !data.database) return ctx.icons.databaseIcon;
  const key = `${data.conid}::${data.database}`;
  if (ctx.openedDatabases.value.includes(key)) return ctx.icons.databaseConnectedIcon;
  return ctx.icons.databaseIcon;
}

export async function onClick(data: TreeNode, node: any, ctx: NodeHandlerContext): Promise<void> {
  if (!data.conid || !data.database) return;
  const key = `${data.conid}::${data.database}`;
  const isExpanded = ctx.expandedConnections.value.includes(key);
  const isOpened = ctx.openedDatabases.value.includes(key);

  if (isExpanded) {
    ctx.bootstrap.updateExpandedConnections((old: string[]) => old.filter((id) => id !== key));
    node.expanded = false;
    return;
  }

  if (!isOpened) {
    return;
  }

  ctx.bootstrap.updateExpandedConnections((old: string[]) => [...old, key]);
  if (data.children && data.children.length > 0) {
    for (const child of data.children as TreeNode[]) {
      if (child.type === 'tables' || child.type === 'views' || child.type === 'functions') {
        await ctx.loadCategoryObjects(child);
      }
    }
    await ctx.nextTick();
  }
  node.expanded = true;
}

export async function onDblClick(data: TreeNode, ctx: NodeHandlerContext): Promise<void> {
  if (!data.conid || !data.database) return;
  const key = `${data.conid}::${data.database}`;
  data.loading = true;
  try {
    await ctx.serverConnectionsRefreshApi({ conid: data.conid, keepOpen: true });
    await ctx.databaseConnectionsRefreshApi({
      conid: data.conid,
      database: data.database,
      keepOpen: true,
    });
    const info = (await ctx.getDatabaseInfo({ conid: data.conid, database: data.database })) as Record<string, unknown>;
    const cacheData = info && typeof info === 'object' ? info : {};
    ctx.structureCache.value[key] = cacheData;

    if (data.children && data.children.length > 0) {
      for (const child of data.children as TreeNode[]) {
        if (child.type === 'tables' || child.type === 'views' || child.type === 'functions') {
          await ctx.loadCategoryObjects(child);
        }
      }
    }

    await ctx.nextTick();
    ctx.bootstrap.updateOpenedDatabases((old: string[]) => (old.includes(key) ? old : [...old, key]));
    ctx.bootstrap.updateExpandedConnections((old: string[]) => (old.includes(key) ? old : [...old, key]));
    await ctx.nextTick();
    const treeNode = ctx.treeRef.value?.getNode?.(data.id);
    if (treeNode) treeNode.expanded = true;
  } catch (e) {
    console.error('连接数据库失败', e);
  } finally {
    data.loading = false;
  }
}

export function getContextMenuItems(_data: TreeNode, _ctx: NodeHandlerContext): ContextMenuItem[] {
  return DATABASE_MENU_ITEMS.map((item) => ({
    label: item.text,
    command: item.command || undefined,
    divider: item.divider,
  }));
}
