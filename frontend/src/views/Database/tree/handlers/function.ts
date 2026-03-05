import type { TreeNode, NodeHandlerContext } from '../types';

export function getIcon(_data: TreeNode, ctx: NodeHandlerContext): string {
  return ctx.icons.functionIcon;
}
