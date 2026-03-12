import type { TreeNode, NodeHandlerContext } from '../types';

export function getIcon(data: TreeNode, ctx: NodeHandlerContext): string {
  if (data.type === 'views') return ctx.icons.viewIcon;
  if (data.type === 'functions') return ctx.icons.functionIcon;
  return ctx.icons.tableIcon;
}

export async function onClick(data: TreeNode, node: any, ctx: NodeHandlerContext): Promise<void> {
  if (node.expanded && (!data.children || data.children.length === 0)) {
    await ctx.loadCategoryObjects(data);
    await ctx.nextTick();
    ctx.treeRef.value?.setSelected(data.id, true);
  }
}

export async function onExpand(data: TreeNode, ctx: NodeHandlerContext): Promise<void> {
  if (!data.children || data.children.length === 0) {
    await ctx.loadCategoryObjects(data);
    await ctx.nextTick();
  }
}
