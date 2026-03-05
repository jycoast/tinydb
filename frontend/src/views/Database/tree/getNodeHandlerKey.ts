import type { TreeNode } from './types';

export function getNodeHandlerKey(data: TreeNode): string {
  return data.type;
}
