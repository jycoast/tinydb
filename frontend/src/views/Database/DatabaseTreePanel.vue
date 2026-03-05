<template>
  <div class="database-tree-panel">
    <el-empty v-if="treeData.length === 0 && !loading" description="暂无连接" />
    <el-tree
      v-else
      ref="treeRef"
      :data="filteredTreeData"
      :props="treeProps"
      :expand-on-click-node="true"
      :default-expand-all="false"
      :filter-node-method="filterNode"
      node-key="id"
      :highlight-current="true"
      :lazy="false"
      class="database-tree"
      @node-click="handleNodeClick"
      @node-expand="handleNodeExpand"
      @node-contextmenu="handleContextMenu"
    >
      <template #default="{ node, data }">
        <div
          class="tree-node"
          :class="{
            'tree-node--leaf': node.isLeaf,
            'tree-node--parent': !node.isLeaf,
          }"
          @dblclick.stop="handleNodeDblClick(data)"
        >
          <img
            v-if="data.type === 'connection'"
            :src="
              data.conid && openedConnections.includes(data.conid)
                ? connectionConnectedIcon
                : connectionIcon
            "
            alt="connection"
            class="node-icon connection-icon"
          />
          <img
            v-if="data.type === 'database'"
            :src="
              data.conid && openedConnections.includes(data.conid)
                ? databaseConnectedIcon
                : databaseIcon
            "
            alt="database"
            class="node-icon connection-icon"
          />
          <img
            v-if="data.type === 'category'"
            :src="
              data.category === 'views'
                ? viewIcon
                : data.category === 'functions'
                ? functionIcon
                : tableIcon
            "
            alt=""
            class="node-icon connection-icon"
          />
          <img
            v-if="data.type === 'object'"
            :src="
              data.category === 'views'
                ? viewIcon
                : data.category === 'functions'
                ? functionIcon
                : tableIcon
            "
            alt=""
            class="node-icon connection-icon"
          />
          <img
            v-if="data.type === 'column'"
            :src="columnsIcon"
            alt=""
            class="node-icon connection-icon"
          />
          <span class="node-label">{{ node.label }}</span>
          <span v-if="data.extInfo" class="node-ext-info">{{ data.extInfo }}</span>
          <el-icon
            v-if="data.type === 'connection' && disconnectingConid === data.conid"
            class="status-icon is-loading"
            title="断开中..."
          >
            <Loading />
          </el-icon>
          <el-icon
            v-else-if="data.statusIcon"
            :class="['status-icon', data.statusIcon]"
            :title="data.statusTitle"
          >
            <component :is="getStatusIcon(data.statusIcon)" />
          </el-icon>
        </div>
      </template>
    </el-tree>
  </div>
</template>

<script lang="ts" setup>
  import { ref, computed, watch, nextTick } from 'vue';
  import { ElMessage, ElMessageBox } from 'element-plus';
  import { CircleCheck, CircleClose, Loading } from '@element-plus/icons-vue';
  import databaseIcon from '/src/assets/svg/database.svg';
  import databaseConnectedIcon from '/@/assets/svg/database-connected.svg';
  import connectionIcon from '/@/assets/svg/connection.svg';
  import connectionConnectedIcon from '/@/assets/svg/connection-connected.svg';
  import tableIcon from '/@/assets/svg/table.svg';
  import functionIcon from '/@/assets/svg/function.svg';
  import viewIcon from '/@/assets/svg/view.svg';
  import columnsIcon from '/@/assets/svg/columns.svg';
  import getConnectionLabel from '/@/utils/tinydb/getConnectionLabel';
  import { storeToRefs } from 'pinia';
  import { sortBy } from 'lodash-es';
  import { useBootstrapStore } from '/@/store/modules/bootstrap';
  import {
    getDatabaseInfo,
    getDatabaseList,
    useDatabaseInfo,
    serverConnectionsRefreshApi,
    databaseConnectionsRefreshApi,
  } from '/@/api';
  import { createContextMenu } from '/@/components/Modals/createContextMenu';
  import type { IActiveConnection } from '/@/types/connections';
  import type { TablesNameSort } from '/@/types/mysql';
  import type { ElTree } from 'element-plus';

  export interface TreeNode {
    id: string;
    label: string;
    type: 'connection' | 'database' | 'category' | 'object' | 'column';
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
  }

  const props = defineProps<{
    connectionsWithStatus: IActiveConnection[];
    loading: boolean;
    searchKeyword?: string;
  }>();

  const emit = defineEmits<{
    (e: 'edit-connection', node: TreeNode): void;
    (e: 'delete-connection', node: TreeNode): void;
    (e: 'refresh-connection', node: TreeNode): void;
    (e: 'disconnect-connection', node: TreeNode): void;
    (e: 'copy-connection', node: TreeNode): void;
    (e: 'new-query', node: TreeNode): void;
    (e: 'create-database', node: TreeNode): void;
    (e: 'server-summary', node: TreeNode): void;
    (e: 'open-table', node: TreeNode): void;
    (e: 'copy-table-name', node: TreeNode): void;
    (e: 'create-table', node: TreeNode): void;
    (e: 'drop-table', node: TreeNode): void;
    (e: 'truncate-table', node: TreeNode): void;
    (e: 'design-table', node: TreeNode): void;
    (e: 'db-command', payload: { command: string; node: TreeNode }): void;
  }>();

  const treeData = ref<TreeNode[]>([]);
  const treeRef = ref<InstanceType<typeof ElTree>>();
  const contextMenuNode = ref<TreeNode | null>(null);
  const disconnectingConid = ref<string | null>(null);
  const structureCache = ref<Record<string, any>>({});

  const bootstrap = useBootstrapStore();
  const { openedConnections, expandedConnections } = storeToRefs(bootstrap);

  const treeProps = { children: 'children', label: 'label' };

  watch(
    () => props.connectionsWithStatus,
    () => buildTreeData(),
    { deep: true, immediate: true },
  );

  watch(
    () => props.searchKeyword ?? '',
    (val) => {
      treeRef.value?.filter(val);
    },
  );

  const filteredTreeData = computed(() => {
    const keyword = (props.searchKeyword ?? '').trim();
    if (!keyword) return treeData.value;
    return filterTreeData(treeData.value, keyword.toLowerCase());
  });

  function filterTreeData(data: TreeNode[], keyword: string): TreeNode[] {
    const result: TreeNode[] = [];
    for (const node of data) {
      const matches =
        node.label.toLowerCase().includes(keyword) ||
        (node.extInfo && node.extInfo.toLowerCase().includes(keyword));
      let filteredChildren: TreeNode[] = [];
      if (node.children) filteredChildren = filterTreeData(node.children, keyword);
      if (matches || filteredChildren.length > 0) {
        result.push({
          ...node,
          children: filteredChildren.length > 0 ? filteredChildren : node.children,
        });
      }
    }
    return result;
  }

  function filterNode(value: string, data: TreeNode) {
    if (!value) return true;
    const keyword = value.toLowerCase();
    return (
      data.label.toLowerCase().includes(keyword) ||
      (data.extInfo && data.extInfo.toLowerCase().includes(keyword))
    );
  }

  async function buildTreeData() {
    const tree: TreeNode[] = [];
    const sortedConnections = sortBy(props.connectionsWithStatus, (conn) =>
      (getConnectionLabel(conn) || '').toUpperCase(),
    );
    for (const conn of sortedConnections) {
      const connectionLabel =
        getConnectionLabel(conn) ||
        (conn as any).name ||
        (conn as any).displayName ||
        (conn as any).label ||
        (conn as any).host ||
        (conn as any).server ||
        'Unknown Connection';
      const connectionNode: TreeNode = {
        id: `connection_${conn._id}`,
        label: connectionLabel,
        type: 'connection',
        conid: conn._id,
        extInfo: conn.engine,
        statusIcon: getConnectionStatusIcon(conn),
        statusTitle: (conn as any).status?.message,
        rawData: conn,
        children: [],
      };
      if (expandedConnections.value.includes(conn._id)) {
        await loadDatabasesForConnection(connectionNode, conn);
      }
      tree.push(connectionNode);
    }
    treeData.value = tree;
  }

  async function loadDatabasesForConnection(connectionNode: TreeNode, conn: IActiveConnection) {
    clearStructureCacheForConnection(conn._id);
    try {
      let databases: TablesNameSort[] = [];
      if ((conn as any).singleDatabase) {
        const name = (conn as any).defaultDatabase || (conn as any).database || 'default';
        databases = [{ name, sortOrder: '0' }];
      } else {
        const raw = await getDatabaseList({ conid: String(conn._id) });
        if (Array.isArray(raw)) {
          databases = raw.map((d: any) => ({
            name: d?.name ?? d?.Name ?? String(d),
            sortOrder: d?.sortOrder ?? '0',
          }));
        }
      }
      const sortedDatabases = sortBy(databases, (db) => db.sortOrder ?? db.name);
      connectionNode.children = sortedDatabases.map((db) => ({
        id: `database_${conn._id}_${db.name}`,
        label: db.name,
        type: 'database',
        conid: conn._id,
        database: db.name,
        rawData: { ...db, connection: conn },
        children: [
          {
            id: `category_${conn._id}_${db.name}_tables`,
            label: '表',
            type: 'category',
            conid: conn._id,
            database: db.name,
            category: 'tables',
            children: [],
          },
          {
            id: `category_${conn._id}_${db.name}_views`,
            label: '视图',
            type: 'category',
            conid: conn._id,
            database: db.name,
            category: 'views',
            children: [],
          },
          {
            id: `category_${conn._id}_${db.name}_functions`,
            label: '函数',
            type: 'category',
            conid: conn._id,
            database: db.name,
            category: 'functions',
            children: [],
          },
        ],
      }));
      for (const dbNode of connectionNode.children as TreeNode[]) {
        if (!dbNode.database) continue;
        const cacheKey = `${conn._id}::${dbNode.database}`;
        try {
          const info = await getDatabaseInfo({ conid: conn._id, database: dbNode.database });
          if (info && typeof info === 'object') structureCache.value[cacheKey] = info;
        } catch {
          /**/
        }
      }
    } catch (e) {
      console.error('加载数据库列表失败', e);
      connectionNode.children = [];
    }
  }

  function clearStructureCacheForConnection(conid: string) {
    const keys = Object.keys(structureCache.value).filter((k) => k.startsWith(`${conid}::`));
    keys.forEach((k) => delete structureCache.value[k]);
  }

  function clearStructureCacheForDatabase(conid: string, database: string) {
    delete structureCache.value[`${conid}::${database}`];
  }

  function buildCategoryChildrenFromObjects(node: TreeNode, objects: any): void {
    if (!node.category) return;
    const objectTypeFields = getObjectTypeFields(node.category);
    const objectList: any[] = [];
    for (const field of objectTypeFields) {
      const items = objects[field] || [];
      for (const obj of items) objectList.push({ ...obj, objectTypeField: field });
    }
    const sortedList = sortBy(objectList, ['schemaName', 'pureName']);
    node.children = sortedList.map((obj) => {
      const tableNode: TreeNode = {
        id: `object_${node.conid}_${node.database}_${node.category}_${obj.pureName}`,
        label: obj.pureName || obj.name,
        type: 'object',
        conid: node.conid,
        database: node.database,
        category: node.category,
        objectType: obj.objectTypeField,
        schemaName: obj.schemaName,
        pureName: obj.pureName,
        rawData: obj,
        children: [],
      };
      if (node.category === 'tables' && obj.objectTypeField === 'tables') {
        tableNode.children = [
          {
            id: `columns_placeholder_${tableNode.id}`,
            label: '加载中...',
            type: 'column',
            children: [],
          },
        ];
      }
      return tableNode;
    });
    if (node.children!.length === 0) {
      node.children = [{ id: `empty_${node.id}`, label: '暂无数据', type: 'object', children: [] }];
    }
  }

  async function loadCategoryObjects(node: TreeNode) {
    if (!node.conid || !node.database || !node.category) return;
    const cacheKey = `${node.conid}::${node.database}`;
    const cached = structureCache.value[cacheKey];
    if (cached && typeof cached === 'object' && Object.keys(cached).length > 0) {
      buildCategoryChildrenFromObjects(node, cached);
      return;
    }
    try {
      const objects = (await getDatabaseInfo({
        conid: node.conid,
        database: node.database,
      })) as Record<string, unknown>;
      const data = objects && typeof objects === 'object' ? objects : {};
      structureCache.value[cacheKey] = data;
      buildCategoryChildrenFromObjects(node, data);
    } catch (e) {
      console.error('加载对象列表失败', e);
      node.children = [{ id: `error_${node.id}`, label: '加载失败', type: 'object', children: [] }];
    }
  }

  function getObjectTypeFields(category: string): string[] {
    switch (category) {
      case 'tables':
        return ['tables'];
      case 'views':
        return ['views', 'matviews'];
      case 'functions':
        return ['functions'];
      default:
        return [];
    }
  }

  function getConnectionStatusIcon(conn: IActiveConnection): string {
    if (!openedConnections.value.includes(conn._id)) return '';
    const status = (conn as any).status;
    if (!status) return 'loading';
    if (status.name === 'ok') return 'ok';
    if (status.name === 'error') return 'error';
    return 'loading';
  }

  function getStatusIcon(iconType: string) {
    switch (iconType) {
      case 'ok':
        return CircleCheck;
      case 'error':
        return CircleClose;
      case 'loading':
        return Loading;
      default:
        return null;
    }
  }

  async function handleNodeClick(data: TreeNode, node: any) {
    if (data.type === 'connection' && data.conid) {
      const isExpanded = expandedConnections.value.includes(data.conid);
      if (!isExpanded) {
        bootstrap.updateExpandedConnections((old) => [...old, data.conid!]);
        bootstrap.updateOpenedConnections((old) =>
          old.includes(data.conid!) ? old : [...old, data.conid!],
        );
        try {
          await serverConnectionsRefreshApi({ conid: data.conid, keepOpen: true });
        } catch (e) {
          console.error('打开连接失败', e);
        }
        const connectionNode = treeData.value.find((n) => n.id === `connection_${data.conid}`);
        if (connectionNode) {
          const conn = props.connectionsWithStatus.find((c) => c._id === data.conid);
          if (conn) {
            await loadDatabasesForConnection(connectionNode, conn);
            await nextTick();
            treeRef.value?.setCurrentKey(node.key);
            node.expanded = true;
          }
        }
      } else {
        bootstrap.updateExpandedConnections((old) => old.filter((id) => id !== data.conid));
        node.expanded = false;
      }
    }

    if (data.type === 'database' && data.conid && data.database) {
      const key = `${data.conid}::${data.database}`;
      const isExpanded = expandedConnections.value.includes(key);
      if (!isExpanded) {
        bootstrap.updateExpandedConnections((old) => [...old, key]);
        try {
          await serverConnectionsRefreshApi({ conid: data.conid, keepOpen: true });
          await databaseConnectionsRefreshApi({
            conid: data.conid,
            database: data.database,
            keepOpen: true,
          });
          if (data.children && data.children.length > 0) {
            const tablesCategory = data.children.find((c: TreeNode) => c.category === 'tables');
            if (tablesCategory) {
              await loadCategoryObjects(tablesCategory);
              await nextTick();
            }
          }
        } catch (e) {
          console.error('刷新数据库结构失败', e);
        }
        node.expanded = true;
      } else {
        bootstrap.updateExpandedConnections((old) => old.filter((id) => id !== key));
        node.expanded = false;
      }
    }

    if (data.type === 'category') {
      if (node.expanded && (!data.children || data.children.length === 0)) {
        await loadCategoryObjects(data);
        await nextTick();
        treeRef.value?.setCurrentKey(node.key);
      }
    }

    if (data.type === 'object' && data.category === 'tables' && data.objectType === 'tables') {
      node.expanded = !node.expanded;
    }
  }

  function handleNodeDblClick(data: TreeNode) {
    if (data.type === 'object' && data.category === 'tables' && data.objectType === 'tables') {
      emit('open-table', data);
    }
  }

  async function handleNodeExpand(data: TreeNode) {
    if (data.type === 'category' && (!data.children || data.children.length === 0)) {
      await loadCategoryObjects(data);
      await nextTick();
    }
    if (
      data.type === 'object' &&
      data.category === 'tables' &&
      data.objectType === 'tables' &&
      data.children?.length === 1 &&
      data.children[0].id.includes('columns_placeholder')
    ) {
      await loadTableColumns(data);
      await nextTick();
    }
  }

  async function loadTableColumns(tableNode: TreeNode) {
    if (!tableNode.conid || !tableNode.database || !tableNode.pureName) return;
    try {
      const objectsRef = ref<any>(null);
      useDatabaseInfo({ conid: tableNode.conid, database: tableNode.database }, objectsRef);
      let retries = 0;
      while (retries < 10 && (!objectsRef.value || !objectsRef.value.tables)) {
        await new Promise((r) => setTimeout(r, 200));
        retries++;
      }
      const objects = objectsRef.value || {};
      const tables = objects.tables || [];
      const table = tables.find(
        (t: any) =>
          t.pureName === tableNode.pureName ||
          (t.schemaName === tableNode.schemaName && t.pureName === tableNode.pureName),
      );
      if (table && table.columns && Array.isArray(table.columns)) {
        tableNode.children = table.columns.map((col: any) => ({
          id: `column_${tableNode.conid}_${tableNode.database}_${tableNode.pureName}_${col.columnName}`,
          label: col.columnName,
          type: 'column',
          extInfo: col.columnComment ? `${col.columnComment}` : '',
          rawData: col,
        }));
      } else {
        tableNode.children = [
          {
            id: `column_empty_${tableNode.id}`,
            label: '暂无列信息',
            type: 'column',
            children: [],
          },
        ];
      }
    } catch (e) {
      console.error('加载表结构失败', e);
      tableNode.children = [
        {
          id: `column_error_${tableNode.id}`,
          label: '加载失败',
          type: 'column',
          children: [],
        },
      ];
    }
  }

  function handleContextMenu(event: MouseEvent, data: TreeNode) {
    event.preventDefault();
    event.stopPropagation();
    contextMenuNode.value = data;
    const menuItems = getContextMenuItems(data);
    const items = menuItems.map((m) =>
      m.divider
        ? { divider: true, label: '' }
        : {
            label: m.label,
            disabled: !!m.disabled,
            onClick: () => m.command && handleMenuCommand(m.command),
          },
    );
    createContextMenu({ event, items });
  }

  function getContextMenuItems(data: TreeNode): any[] {
    const items: any[] = [];
    if (data.type === 'connection') {
      const conn = props.connectionsWithStatus.find((c) => c._id === data.conid);
      const isOpened = conn && openedConnections.value.includes(conn._id);
      if (isOpened) items.push({ label: '关闭连接', command: 'disconnect-connection' });
      items.push(
        { label: '编辑连接', command: 'edit-connection' },
        { label: '复制连接', command: 'copy-connection' },
        { label: '新建查询', command: 'new-query' },
      );
      if (isOpened) items.push({ label: '刷新', command: 'refresh-connection' });
      items.push(
        { divider: true },
        { label: '删除', command: 'delete-connection' },
        { label: '创建数据库', command: 'create-database' },
        { label: '服务器概览', command: 'server-summary' },
      );
    } else if (data.type === 'database') {
      const menuItems = getDatabaseMenuItems(data.conid, data.database);
      items.push(
        ...menuItems.map((item: any) => ({
          label: item.text,
          command: item.command,
          divider: item.divider,
        })),
      );
    } else if (data.type === 'object' && data.category === 'tables') {
      items.push(
        { label: '打开表', command: 'open-table' },
        { label: '新建表', command: 'create-table' },
        { label: '删除表', command: 'drop-table' },
        { label: '清空表', command: 'truncate-table' },
        { label: '设计表', command: 'design-table' },
        { label: '复制表名', command: 'copy-table-name' },
      );
    }
    return items;
  }

  function getDatabaseMenuItems(_conid?: string, _database?: string) {
    return [
      { text: '新建查询', command: 'db-new-query' },
      { text: '新建表', command: 'db-create-table' },
      { text: '新建集合', command: '' },
      { text: '导入向导', command: '' },
      { text: '导出向导', command: '' },
      { text: '恢复/导入 SQL 转储', command: '' },
      { text: '备份/导出 SQL 转储', command: '' },
      { divider: true },
      { text: '关闭数据库', command: 'db-close-database' },
    ];
  }

  async function handleMenuCommand(command: string) {
    const node = contextMenuNode.value;
    if (!node) return;
    try {
      if (command === 'disconnect-connection') {
        await handleDisconnectConnection(node);
        return;
      }
      if (command.startsWith('db-')) {
        emit('db-command', { command, node });
        return;
      }
      switch (command) {
        case 'edit-connection':
          emit('edit-connection', node);
          break;
        case 'delete-connection':
          emit('delete-connection', node);
          break;
        case 'refresh-connection':
          emit('refresh-connection', node);
          break;
        case 'copy-connection':
          emit('copy-connection', node);
          break;
        case 'new-query':
          emit('new-query', node);
          break;
        case 'create-database':
          emit('create-database', node);
          break;
        case 'server-summary':
          emit('server-summary', node);
          break;
        case 'open-table':
          emit('open-table', node);
          break;
        case 'copy-table-name':
          emit('copy-table-name', node);
          break;
        case 'create-table':
          emit('create-table', node);
          break;
        case 'drop-table':
          emit('drop-table', node);
          break;
        case 'truncate-table':
          emit('truncate-table', node);
          break;
        case 'design-table':
          emit('design-table', node);
          break;
      }
    } catch (e: any) {
      console.error('执行菜单命令失败', e);
      ElMessage.error(e?.message || '操作失败');
    }
  }

  async function handleDisconnectConnection(node: TreeNode) {
    const conn = props.connectionsWithStatus.find((c) => c._id === node.conid);
    if (conn) await disconnectServerConnection(conn, true);
  }

  function disconnectServerConnection(conid: any, showConfirmation = true): Promise<void> {
    const id = conid?._id;
    if (!id) return Promise.resolve();
    const doDisconnect = async () => {
      disconnectingConid.value = id;
      try {
        try {
          await serverConnectionsRefreshApi({ conid: id, keepOpen: false });
        } catch (e) {
          console.warn('serverConnectionsRefreshApi(close) failed', e);
        }
        try {
          const current = bootstrap.currentDatabase as any;
          const dbName = current?.connection?._id === id ? current?.name : conid?.defaultDatabase;
          if (dbName) {
            await databaseConnectionsRefreshApi({ conid: id, database: dbName, keepOpen: false });
          }
        } catch (e) {
          console.warn('databaseConnectionsRefreshApi(close) failed', e);
        }
        const { removeLocalStorage } = await import('/@/utils/tinydb/storageCache');
        removeLocalStorage(`database_list_${id}`);
        bootstrap.updateExpandedConnections((list) => list.filter((x) => x !== id));
        bootstrap.updateOpenedConnections((list) => list.filter((x) => x !== id));
        bootstrap.updateOpenedSingleDatabaseConnections((list) => list.filter((x) => x !== id));
        if ((bootstrap.currentDatabase as any)?.connection?._id === id) {
          bootstrap.setCurrentDatabase(null);
        }
      } finally {
        disconnectingConid.value = null;
      }
      buildTreeData();
    };
    if (!showConfirmation) return doDisconnect();
    return ElMessageBox.confirm(`确定要断开 ${getConnectionLabel(conid)}?`, '断开确认', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    })
      .then(() => doDisconnect())
      .catch(() => {});
  }

  async function refreshDatabaseStructure(conid: string, database: string) {
    clearStructureCacheForDatabase(conid, database);
    const categoryNode = treeData.value
      .flatMap((c) => c.children || [])
      .flatMap((db) => db.children || [])
      .find((cat) => cat.category === 'tables' && cat.conid === conid && cat.database === database);
    if (categoryNode) await loadCategoryObjects(categoryNode);
  }

  defineExpose({
    refreshDatabaseStructure,
    buildTreeData,
  });
</script>

<style scoped>
  .database-tree-panel {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-height: 0;
    overflow: hidden;
  }

  .database-tree {
    flex: 1;
    overflow: auto;
    background: var(--theme-bg-0);
  }

  .tree-node {
    display: flex;
    align-items: center;
    gap: 8px;
    flex: 1;
    font-size: 14px;
    padding-right: 8px;
    min-width: 0;
    overflow: hidden;
  }

  .node-icon {
    font-size: 20px;
    flex-shrink: 0;
  }

  .connection-icon {
    width: 14px;
    height: 14px;
    object-fit: contain;
  }

  .node-label {
    flex: 1;
    color: var(--theme-font-1);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    width: 160px;
  }

  .node-ext-info {
    margin-left: 8px;
    font-size: 12px;
    color: var(--theme-font-2);
    flex-shrink: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    width: 80px;
  }

  .status-icon {
    margin-left: 8px;
    font-size: 14px;
    flex-shrink: 0;
  }

  .status-icon.ok {
    color: var(--el-color-success);
  }

  .status-icon.error {
    color: var(--el-color-danger);
  }

  .status-icon.loading {
    color: var(--el-color-info);
    animation: rotating 2s linear infinite;
  }

  @keyframes rotating {
    to {
      transform: rotate(360deg);
    }
  }

  :deep(
      .database-tree > .el-tree-node > .el-tree-node__content > .el-tree-node__expand-icon.is-leaf
    ) {
    width: 0;
    padding: 0;
    margin: 0;
    border: none;
    visibility: hidden;
    overflow: hidden;
  }

  :deep(
      .database-tree
        > .el-tree-node
        > .el-tree-node__content
        > .el-tree-node__expand-icon.is-leaf::before
    ) {
    content: none;
  }
</style>
