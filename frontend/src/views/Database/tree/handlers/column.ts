import type { TreeNode, NodeHandlerContext } from '../types';

export function getIcon(data: TreeNode, ctx: NodeHandlerContext): string {
  return ctx.icons.columnsIcon;
}
