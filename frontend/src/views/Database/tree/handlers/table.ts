import type { TreeNode, NodeHandlerContext, ContextMenuItem } from '../types';

export function getIcon(_data: TreeNode, ctx: NodeHandlerContext): string {
  return ctx.icons.tableIcon;
}

export function onClick(data: TreeNode, node: any, _ctx: NodeHandlerContext): void {
  node.expanded = !node.expanded;
}

export function onDblClick(data: TreeNode, ctx: NodeHandlerContext): void {
  ctx.emit('open-table', data);
}

export async function onExpand(data: TreeNode, ctx: NodeHandlerContext): Promise<void> {
  if (
    data.children?.length === 1 &&
    data.children[0].id.includes('columns_placeholder')
  ) {
    await ctx.loadTableColumns(data);
    await ctx.nextTick();
  }
}

export function getContextMenuItems(_data: TreeNode, _ctx: NodeHandlerContext): ContextMenuItem[] {
  return [
    { label: '打开表', command: 'open-table' },
    { label: '新建表', command: 'create-table' },
    { label: '删除表', command: 'drop-table' },
    { label: '清空表', command: 'truncate-table' },
    { label: '设计表', command: 'design-table' },
    { label: '复制表名', command: 'copy-table-name' },
  ];
}
