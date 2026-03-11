<template>
  <div class="database-tree-page" :class="{ collapsed: isCollapsed }">
    <div class="page-content">
      <div v-show="!isCollapsed" class="left-panel-actions">
        <el-button size="small" class="panel-action-btn" @click="runCommand('new.query')">
          <el-icon><Document /></el-icon>
          <span>新建查询</span>
        </el-button>
        <el-button size="small" class="panel-action-btn" @click="runCommand('query.history')">
          <el-icon><Clock /></el-icon>
          <span>查询历史</span>
        </el-button>
      </div>
      <div class="search-row">
        <el-input
          v-show="!isCollapsed"
          v-model="searchText"
          clearable
          placeholder="搜索连接或数据库..."
          size="small"
          class="search-input"
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>
        <el-button
          class="collapse-btn"
          circle
          size="small"
          :title="isCollapsed ? '展开' : '折叠'"
          @click="handleToggleCollapse"
        >
          <el-icon><DArrowLeft v-if="!isCollapsed" /><DArrowRight v-else /></el-icon>
        </el-button>
      </div>

      <template v-if="!isCollapsed">
        <DatabaseTreePanel
          ref="treePanelRef"
          :connections-with-status="connectionsWithStatus"
          :loading="loading"
          :search-keyword="searchText"
          @edit-connection="handleEditConnection"
          @delete-connection="handleDeleteConnection"
          @refresh-connection="handleRefreshConnection"
          @copy-connection="handleCopyConnection"
          @new-query="handleNewQuery"
          @create-database="handleCreateDatabase"
          @server-summary="handleServerSummary"
          @open-table="openTableData"
          @copy-table-name="handleCopyTableName"
          @create-table="handleCreateTable"
          @drop-table="handleDropTable"
          @truncate-table="handleTruncateTable"
          @design-table="handleDesignTable"
          @db-command="handleDbCommand"
        />
      </template>
    </div>

    <CreateDatabaseModal @register="registerCreateDatabaseModal" />
    <CreateTableModal @register="registerCreateTableModal" />
    <TableDesignModal ref="tableDesignModalRef" @register="registerTableDesignModal" />
  </div>
</template>

<script lang="ts" setup>
  import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue';
  import { ElMessage, ElMessageBox } from 'element-plus';
  import { DArrowLeft, DArrowRight, Document, Clock, Search } from '@element-plus/icons-vue';
  import openNewTab from '/@/utils/tinydb/openNewTab';
  import getConnectionLabel from '/@/utils/tinydb/getConnectionLabel';
  import { storeToRefs } from 'pinia';
  import { useBootstrapStore } from '/@/store/modules/bootstrap';
  import { useClusterApiStore } from '/@/store/modules/clusterApi';
  import { useLocaleStore } from '/@/store/modules/locale';
  import {
    getConnectionInfo,
    useConnectionList,
    useDatabaseInfo,
    useServerStatus,
    serverConnectionsRefreshApi,
    databaseConnectionsRefreshApi,
    connectionDeleteApi,
    databaseConnectionsSqlSelectApi,
  } from '/@/api';
  import { saveQueryHistory } from '/@/utils/queryHistory';
  import { runCommand } from '/@/commands';
  import { useModal } from '/@/components/Modals';
  import CreateDatabaseModal from '/@/components/Modals/CreateDatabaseModal.vue';
  import CreateTableModal from '/@/components/Modals/CreateTableModal.vue';
  import TableDesignModal from './Table/TableDesignModal.vue';
  import DatabaseTreePanel from './DatabaseTreePanel.vue';
  import type { TreeNode } from './DatabaseTreePanel.vue';
  import type { IActiveConnection, IConnectionStatus } from '/@/types/connections';

  const treePanelRef = ref<InstanceType<typeof DatabaseTreePanel>>();
  const loading = ref(false);
  const searchText = ref('');

  const COLLAPSED_WIDTH = 24;
  const EXPANDED_DEFAULT_WIDTH = 280;
  const localeStore = useLocaleStore();
  const { leftPanelWidth } = storeToRefs(localeStore);
  const isCollapsed = computed(() => Number(leftPanelWidth.value) < 80);
  function handleToggleCollapse() {
    localeStore.updateLeftPanelWidth((w) => (w < 80 ? EXPANDED_DEFAULT_WIDTH : COLLAPSED_WIDTH));
  }

  const [registerCreateDatabaseModal, { openModal: openCreateDatabaseModal }] = useModal();
  const [registerCreateTableModal, { openModal: openCreateTableModal }] = useModal();
  const [registerTableDesignModal, { openModal: openTableDesignModal }] = useModal();

  const tableDesignModalRef = ref();

  const bootstrap = useBootstrapStore();
  const clusterApi = useClusterApiStore();
  const { openedConnections } = storeToRefs(bootstrap);
  const { connectionList: clusterConnections } = storeToRefs(clusterApi);

  const serverStatus = ref<{ [key: string]: IConnectionStatus }>({});
  const connectionsWithStatus = ref<IActiveConnection[]>([]);

  watch(
    () => [clusterConnections.value, serverStatus.value],
    () => {
      if (clusterConnections.value && serverStatus.value) {
        connectionsWithStatus.value = clusterConnections.value.map((conn) => ({
          ...conn,
          status: serverStatus.value[conn._id],
        }));
      } else if (clusterConnections.value) {
        connectionsWithStatus.value = clusterConnections.value;
      }
    },
    { deep: true, immediate: true },
  );

  async function loadConnections() {
    loading.value = true;
    try {
      for (const conid of openedConnections.value) {
        try {
          await serverConnectionsRefreshApi({ conid, keepOpen: true });
        } catch (e) {
          console.error(`刷新连接失败: ${conid}`, e);
        }
      }
      useConnectionList<IActiveConnection[]>(clusterApi.setConnectionList);
      useServerStatus<{ [key: string]: IConnectionStatus }>(serverStatus);
    } finally {
      loading.value = false;
    }
  }

  function handleDbCommand(payload: { command: string; node: TreeNode }) {
    const { command, node } = payload;
    if (command === 'db-new-query') {
      handleNewQuery(node);
    } else if (command === 'db-create-table') {
      if (node.conid && node.database) {
        openCreateTableModal(true, { conid: node.conid, database: node.database });
      }
    } else if (command === 'db-close-database' && node.conid && node.database) {
      ElMessageBox.confirm(`确定要关闭数据库 "${node.database}" 吗？`, '关闭数据库', {
        confirmButtonText: '关闭',
        cancelButtonText: '取消',
      })
        .then(async () => {
          try {
            await databaseConnectionsRefreshApi({
              conid: node.conid!,
              database: node.database!,
              keepOpen: false,
            });
            const current = bootstrap.currentDatabase as any;
            if (current?.connection?._id === node.conid && current?.name === node.database) {
              bootstrap.setCurrentDatabase(null);
            }
            bootstrap.updateOpenedDatabases((list) =>
              list.filter((k) => k !== `${node.conid}::${node.database}`),
            );
            ElMessage.success('数据库已关闭');
            treePanelRef.value?.collapseDatabaseNode(node.conid!, node.database!);
            treePanelRef.value?.refreshDatabaseStructure(node.conid!, node.database!);
          } catch (e: any) {
            ElMessage.error(`关闭数据库失败：${e?.message || String(e)}`);
          }
        })
        .catch(() => {});
    }
  }

  function handleEditConnection(node: TreeNode) {
    const conn = connectionsWithStatus.value.find((c) => c._id === node.conid);
    const payload = conn ? { ...conn } : { _id: node.conid };
    window.dispatchEvent(new CustomEvent('open-connection-modal', { detail: payload }));
  }

  async function handleDeleteConnection(node: TreeNode) {
    const conn = connectionsWithStatus.value.find((c) => c._id === node.conid);
    const connLabel = conn ? getConnectionLabel(conn) : node.label;
    await ElMessageBox.confirm(`确定要删除连接 "${connLabel}" 吗？`, '删除确认', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning',
    });
    try {
      await connectionDeleteApi({ _id: node.conid });
      ElMessage.success('连接已删除');
      loadConnections();
    } catch (e: any) {
      ElMessage.error(`删除失败：${e?.message || String(e)}`);
    }
  }

  async function handleRefreshConnection(node: TreeNode) {
    try {
      await serverConnectionsRefreshApi({ conid: node.conid, keepOpen: true });
      ElMessage.success('连接已刷新');
      loadConnections();
    } catch (e: any) {
      ElMessage.error(`刷新失败：${e?.message || String(e)}`);
    }
  }

  async function handleCopyConnection(node: TreeNode) {
    const conn = connectionsWithStatus.value.find((c) => c._id === node.conid);
    const text = conn ? getConnectionLabel(conn) : node.label;
    try {
      await navigator.clipboard.writeText(text);
      ElMessage.success('已复制到剪贴板');
    } catch {
      ElMessage.error('复制失败');
    }
  }

  async function handleCopyTableName(node: TreeNode) {
    const name = node.schemaName
      ? `${node.schemaName}.${node.pureName}`
      : node.pureName ?? node.label ?? '';
    if (!name) return;
    try {
      await navigator.clipboard.writeText(name);
      ElMessage.success('已复制表名');
    } catch {
      ElMessage.error('复制失败');
    }
  }

  function handleNewQuery(node: TreeNode) {
    const conn = connectionsWithStatus.value.find((c) => c._id === node.conid);
    const title = conn ? `${getConnectionLabel(conn)} - 查询#` : '新建查询#';
    openNewTab(
      {
        title,
        icon: 'icon query',
        tabComponent: 'SqlQueryTab',
        props: { conid: node.conid },
        selected: true,
        busy: false,
      },
      undefined,
      { forceNewTab: true },
    );
  }

  async function openTableData(node: TreeNode) {
    if (!node.conid || !node.database || !node.pureName) return;
    try {
      await serverConnectionsRefreshApi({ conid: node.conid, keepOpen: true });
      await databaseConnectionsRefreshApi({
        conid: node.conid,
        database: node.database,
        keepOpen: true,
      });
    } catch (e: any) {
      const msg = e?.message ?? String(e);
      ElMessage.error(
        msg.includes('not connected') || msg.includes('not established')
          ? '连接已断开或未建立，请先展开该数据库'
          : msg,
      );
      return;
    }
    const tableDisplayName = node.schemaName
      ? `${node.schemaName}.${node.pureName}`
      : node.pureName;
    openNewTab({
      title: `${tableDisplayName} - 数据`,
      icon: 'icon table',
      tabComponent: 'TableDataTab',
      props: {
        conid: node.conid,
        database: node.database,
        schemaName: node.schemaName ?? '',
        pureName: node.pureName,
      },
      selected: true,
      busy: false,
    });
  }

  function handleCreateDatabase(node: TreeNode) {
    openCreateDatabaseModal(true, { conid: node.conid });
  }

  async function handleServerSummary(node: TreeNode) {
    if (!node.conid) {
      ElMessage.error('缺少连接信息');
      return;
    }
    const conn = connectionsWithStatus.value.find((c) => c._id === node.conid);
    if (!conn) {
      ElMessage.error('找不到连接信息');
      return;
    }
    try {
      if (!openedConnections.value.includes(node.conid)) {
        await serverConnectionsRefreshApi({ conid: node.conid, keepOpen: true });
      }
      await openNewTab({
        title: `${getConnectionLabel(conn)} - 服务器概览`,
        icon: 'img server',
        tabComponent: 'ServerSummaryTab',
        props: { conid: node.conid },
        selected: true,
        busy: false,
      });
    } catch (e: any) {
      ElMessage.error(`打开服务器概览失败: ${e?.message || String(e)}`);
    }
  }

  async function handleDropTable(node: TreeNode) {
    const tableName = node.schemaName ? `${node.schemaName}.${node.pureName}` : node.pureName;
    await ElMessageBox.confirm(`确定要删除表 "${tableName}" 吗？此操作不可恢复！`, '删除确认', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning',
    });
    try {
      const { findEngineDriver } = await import('/@/lib/tinydb-tools');
      const { extensions } = storeToRefs(bootstrap);
      const connection = await getConnectionInfo({ conid: node.conid });
      if (!connection) {
        ElMessage.error('无法获取数据库连接信息');
        return;
      }
      const driver = findEngineDriver(connection, extensions.value!);
      if (!driver) {
        ElMessage.error('无法获取数据库驱动');
        return;
      }
      const dumper = driver.createDumper();
      (dumper as any).dropTable({
        schemaName: node.schemaName,
        pureName: node.pureName,
        columns: [],
        primaryKey: null,
        foreignKeys: [],
        indexes: [],
      } as any);
      const sql = dumper.s;
      saveQueryHistory(sql, node.conid!, node.database!);
      const response = (await databaseConnectionsSqlSelectApi({
        conid: node.conid!,
        database: node.database!,
        select: { sql },
      })) as any;
      if (response?.errorMessage) {
        ElMessage.error(`删除表失败：${response.errorMessage}`);
      } else {
        ElMessage.success('表已删除');
        try {
          await databaseConnectionsRefreshApi({
            conid: node.conid!,
            database: node.database!,
            keepOpen: true,
          });
          treePanelRef.value?.refreshDatabaseStructure(node.conid!, node.database!);
        } catch (e) {
          console.warn('刷新数据库结构失败', e);
        }
      }
    } catch (e: any) {
      ElMessage.error(`删除表失败：${e?.message || String(e)}`);
    }
  }

  async function handleTruncateTable(node: TreeNode) {
    const tableName = node.schemaName ? `${node.schemaName}.${node.pureName}` : node.pureName;
    await ElMessageBox.confirm(
      `确定要清空表 "${tableName}" 的所有数据吗？此操作不可恢复！`,
      '清空确认',
      { confirmButtonText: '清空', cancelButtonText: '取消', type: 'warning' },
    );
    try {
      const { findEngineDriver } = await import('/@/lib/tinydb-tools');
      const { extensions } = storeToRefs(bootstrap);
      const connection = await getConnectionInfo({ conid: node.conid });
      if (!connection) {
        ElMessage.error('无法获取数据库连接信息');
        return;
      }
      const driver = findEngineDriver(connection, extensions.value!);
      if (!driver) {
        ElMessage.error('无法获取数据库驱动');
        return;
      }
      const dumper = driver.createDumper();
      dumper.truncateTable({ schemaName: node.schemaName, pureName: node.pureName });
      const sql = dumper.s;
      saveQueryHistory(sql, node.conid!, node.database!);
      const response = (await databaseConnectionsSqlSelectApi({
        conid: node.conid!,
        database: node.database!,
        select: { sql },
      })) as any;
      if (response?.errorMessage) {
        ElMessage.error(`清空表失败：${response.errorMessage}`);
      } else {
        ElMessage.success('表已清空');
      }
    } catch (e: any) {
      ElMessage.error(`清空表失败：${e?.message || String(e)}`);
    }
  }

  async function handleDesignTable(node: TreeNode) {
    if (!node.conid || !node.database || !node.pureName) {
      ElMessage.error('缺少必要的表信息');
      return;
    }
    try {
      const objectsRef = ref<any>(null);
      useDatabaseInfo({ conid: node.conid, database: node.database }, objectsRef);
      let retries = 0;
      while (retries < 10 && (!objectsRef.value || !objectsRef.value.tables)) {
        await new Promise((resolve) => setTimeout(resolve, 200));
        retries++;
      }
      const objects = objectsRef.value || {};
      const tables = objects.tables || [];
      const table = tables.find(
        (t: any) =>
          t.pureName === node.pureName ||
          (t.schemaName === node.schemaName && t.pureName === node.pureName),
      );
      if (!table) {
        ElMessage.error('无法获取表结构信息');
        return;
      }
      openTableDesignModal(true, {
        conid: node.conid,
        database: node.database,
        schemaName: node.schemaName,
        pureName: node.pureName,
        tableStructure: table,
      });
    } catch (e: any) {
      ElMessage.error(`打开表设计失败：${e?.message || String(e)}`);
    }
  }

  function handleCreateTable(node: TreeNode) {
    if (node.conid && node.database) {
      openCreateTableModal(true, { conid: node.conid, database: node.database });
    }
  }

  onMounted(() => {
    useConnectionList<IActiveConnection[]>(clusterApi.setConnectionList);
    useServerStatus<{ [key: string]: IConnectionStatus }>(serverStatus);
    loadConnections();
  });

  onBeforeUnmount(() => {});
</script>

<style scoped>
  .database-tree-page {
    height: 100%;
    width: 100%;
    display: flex;
    flex-direction: column;
    margin: 0;
    box-sizing: border-box;
    background: var(--theme-bg-0);
    overflow: hidden;
  }

  .page-content {
    flex: 1;
    min-height: 0;
    min-width: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    padding: 20px;
  }

  .database-tree-page.collapsed .page-content {
    padding: 8px;
  }

  .left-panel-actions {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
    margin-bottom: 12px;
  }

  .panel-action-btn {
    flex: 1;
    justify-content: center;
  }

  .search-row {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
    margin-bottom: 20px;
  }

  .database-tree-page.collapsed .search-row {
    margin-bottom: 0;
    justify-content: center;
  }

  .search-input {
    flex: 1;
    min-width: 0;
  }

  .collapse-btn {
    flex-shrink: 0;
  }
</style>
