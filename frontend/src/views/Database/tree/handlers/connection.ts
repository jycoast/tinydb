import type { TreeNode, NodeHandlerContext, ContextMenuItem } from '../types';

export function getIcon(data: TreeNode, ctx: NodeHandlerContext): string {
  if (data.conid && ctx.openedConnections.value.includes(data.conid))
    return ctx.icons.connectionConnectedIcon;
  return ctx.icons.connectionIcon;
}

export async function onClick(data: TreeNode, node: any, ctx: NodeHandlerContext): Promise<void> {
  if (!data.conid) return;
  const isExpanded = ctx.expandedConnections.value.includes(data.conid);
  if (!isExpanded) {
    ctx.bootstrap.updateExpandedConnections((old: string[]) => [...old, data.conid!]);
    ctx.bootstrap.updateOpenedConnections((old: string[]) =>
      old.includes(data.conid!) ? old : [...old, data.conid!],
    );
    try {
      await ctx.serverConnectionsRefreshApi({ conid: data.conid, keepOpen: true });
    } catch (e) {
      console.error('打开连接失败', e);
    }
    const connectionNode = ctx.treeData.value.find((n) => n.id === `connection_${data.conid}`);
    if (connectionNode) {
      const conn = ctx.props.connectionsWithStatus.find((c) => c._id === data.conid);
      if (conn) {
        await ctx.loadDatabasesForConnection(connectionNode, conn);
        await ctx.nextTick();
        ctx.treeRef.value?.setCurrentKey(node.key);
        node.expanded = true;
      }
    }
  } else {
    ctx.bootstrap.updateExpandedConnections((old: string[]) =>
      old.filter((id) => id !== data.conid),
    );
    node.expanded = false;
  }
}

export function getContextMenuItems(data: TreeNode, ctx: NodeHandlerContext): ContextMenuItem[] {
  const conn = ctx.props.connectionsWithStatus.find((c) => c._id === data.conid);
  const isOpened = conn && ctx.openedConnections.value.includes(conn._id);
  const items: ContextMenuItem[] = [];
  if (isOpened) items.push({ label: '关闭连接', command: 'disconnect-connection' });
  items.push(
    { label: '编辑连接', command: 'edit-connection' },
    { label: '复制连接', command: 'copy-connection' },
    { label: '新建查询', command: 'new-query' },
  );
  if (isOpened) items.push({ label: '刷新', command: 'refresh-connection' });
  items.push(
    { label: '', command: '', divider: true },
    { label: '删除', command: 'delete-connection' },
    { label: '创建数据库', command: 'create-database' },
    { label: '服务器概览', command: 'server-summary' },
  );
  return items;
}
