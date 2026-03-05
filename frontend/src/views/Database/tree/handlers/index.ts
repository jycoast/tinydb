import type { NodeTypeHandler } from '../types';
import * as connection from './connection';
import * as database from './database';
import * as category from './category';
import * as table from './table';
import * as view from './view';
import * as functionNode from './function';
import * as column from './column';

const connectionHandler: NodeTypeHandler = {
  getIcon: connection.getIcon,
  onClick: connection.onClick,
  getContextMenuItems: connection.getContextMenuItems,
};

const databaseHandler: NodeTypeHandler = {
  getIcon: database.getIcon,
  onClick: database.onClick,
  getContextMenuItems: database.getContextMenuItems,
};

const categoryHandler: NodeTypeHandler = {
  getIcon: category.getIcon,
  onClick: category.onClick,
  onExpand: category.onExpand,
};

const tableHandler: NodeTypeHandler = {
  getIcon: table.getIcon,
  onClick: table.onClick,
  onDblClick: table.onDblClick,
  onExpand: table.onExpand,
  getContextMenuItems: table.getContextMenuItems,
};

const columnHandler: NodeTypeHandler = {
  getIcon: column.getIcon,
};

export const NODE_HANDLERS: Record<string, NodeTypeHandler> = {
  connection: connectionHandler,
  database: databaseHandler,
  tables: categoryHandler,
  views: categoryHandler,
  functions: categoryHandler,
  table: tableHandler,
  view: { getIcon: view.getIcon },
  function: { getIcon: functionNode.getIcon },
  column: columnHandler,
};
