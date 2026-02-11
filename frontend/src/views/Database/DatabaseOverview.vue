<template>
  <div class="database-tree-page" :class="{ collapsed: isCollapsed }">
    <div class="page-content">
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
            <div class="tree-node">
              <img
                v-if="data.type === 'connection'"
                :src="connectionIcon"
                alt="connection"
                class="node-icon connection-icon"
              />
              <img
                v-if="data.type === 'database'"
                :src="databaseIcon"
                alt="connection"
                class="node-icon connection-icon"
              />
              <img
                v-if="data.type === 'category'"
                :src="tableIcon"
                alt="connection"
                class="node-icon connection-icon"
              />
              <img
                v-if="data.type === 'object'"
                :src="tableIcon"
                alt="connection"
                class="node-icon connection-icon"
              />
              <img
                v-if="data.type === 'column'"
                :src="columnsIcon"
                alt="connection"
                class="node-icon connection-icon"
              />
              <span class="node-label">{{ node.label }}</span>
              <span v-if="data.extInfo" class="node-ext-info">{{ data.extInfo }}</span>
              <el-icon
                v-if="data.statusIcon"
                :class="['status-icon', data.statusIcon]"
                :title="data.statusTitle"
              >
                <component :is="getStatusIcon(data.statusIcon)" />
              </el-icon>
            </div>
          </template>
        </el-tree>

        <el-dropdown
          ref="contextMenuRef"
          :teleported="true"
          :visible="contextMenuVisible"
          @command="handleMenuCommand"
          @visible-change="handleMenuVisibleChange"
        >
          <div
            v-show="false"
            :style="{ position: contextMenuStyle.position as any, left: contextMenuStyle.left, top: contextMenuStyle.top }"
          ></div>
          <template #dropdown>
            <el-dropdown-menu>
              <template v-for="(item, index) in contextMenuItems" :key="index">
                <el-dropdown-item
                  v-if="item.divider"
                  divided
                ></el-dropdown-item>
                <el-dropdown-item
                  v-else
                  :command="item.command"
                  :disabled="item.disabled"
                >
                  {{ item.label }}
                </el-dropdown-item>
              </template>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </template>
    </div>

    <CreateDatabaseModal @register="registerCreateDatabaseModal" />
    <CreateTableModal @register="registerCreateTableModal" />
  </div>
</template>

<script lang="ts" setup>
import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, CircleCheck, CircleClose, Loading, DArrowLeft, DArrowRight } from '@element-plus/icons-vue'
import databaseIcon from '/src/assets/svg/database.svg'
import connectionIcon from '/@/assets/svg/connection.svg'
import tableIcon from '/@/assets/svg/table.svg'
import columnsIcon from '/@/assets/svg/columns.svg'
import openNewTab from '/@/second/utility/openNewTab'
import { getConnectionInfo } from '/@/api/bridge'
import getConnectionLabel from '/@/second/utility/getConnectionLabel'
import { storeToRefs } from 'pinia'
import { sortBy } from 'lodash-es'
import { useBootstrapStore } from '/@/store/modules/bootstrap'
import { useClusterApiStore } from '/@/store/modules/clusterApi'
import { useLocaleStore } from '/@/store/modules/locale'
import { useConnectionList, useDatabaseList, useDatabaseInfo, useServerStatus } from '/@/api/bridge'
import { serverConnectionsRefreshApi, databaseConnectionsRefreshApi, connectionDeleteApi, databaseConnectionsSqlSelectApi } from '/@/api/simpleApis'
import { disconnectServerConnection } from '/@/second/appobj/ConnectionAppObject'
import { getDatabaseMenuItems } from '/@/second/appobj/DatabaseAppObject'
import { createContextMenu } from '/@/second/modals/createContextMenu'
import { useModal } from '/@/components/Modal'
import CreateDatabaseModal from '/@/second/modals/CreateDatabaseModal.vue'
import CreateTableModal from '/@/second/modals/CreateTableModal.vue'
import type { IActiveConnection, IConnectionStatus } from '/@/second/typings/types/connections.d'
import type { TablesNameSort } from '/@/second/typings/mysql'
import type { ElTree } from 'element-plus'

interface TreeNode {
  id: string
  label: string
  type: 'connection' | 'database' | 'category' | 'object' | 'column'
  conid?: string
  database?: string
  category?: string
  objectType?: string
  extInfo?: string
  statusIcon?: string
  statusTitle?: string
  children?: TreeNode[]
  rawData?: any
  schemaName?: string
  pureName?: string
}

const searchText = ref('')
const treeData = ref<TreeNode[]>([])
const treeRef = ref<InstanceType<typeof ElTree>>()
const loading = ref(false)

const contextMenuVisible = ref(false)
const contextMenuStyle = ref<{ position: string; left: string; top: string }>({ position: 'fixed', left: '0px', top: '0px' })
const contextMenuItems = ref<any[]>([])
const contextMenuNode = ref<TreeNode | null>(null)

const COLLAPSED_WIDTH = 24
const EXPANDED_DEFAULT_WIDTH = 280
const localeStore = useLocaleStore()
const { leftPanelWidth } = storeToRefs(localeStore)
const isCollapsed = computed(() => Number(leftPanelWidth.value) < 80)
function handleToggleCollapse() {
  localeStore.updateLeftPanelWidth((w) => (w < 80 ? EXPANDED_DEFAULT_WIDTH : COLLAPSED_WIDTH))
}

const [registerCreateDatabaseModal, { openModal: openCreateDatabaseModal }] = useModal()
const [registerCreateTableModal, { openModal: openCreateTableModal }] = useModal()

const bootstrap = useBootstrapStore()
const clusterApi = useClusterApiStore()
const { openedConnections, expandedConnections } = storeToRefs(bootstrap)
const { connectionList: clusterConnections } = storeToRefs(clusterApi)

const serverStatus = ref<{ [key: string]: IConnectionStatus }>({})
const connectionsWithStatus = ref<IActiveConnection[]>([])

const treeProps = {
  children: 'children',
  label: 'label'
}

watch(() => [clusterConnections.value, serverStatus.value], () => {
  if (clusterConnections.value && serverStatus.value) {
    connectionsWithStatus.value = clusterConnections.value.map(conn => ({
      ...conn,
      status: serverStatus.value[conn._id]
    }))
  } else if (clusterConnections.value) {
    connectionsWithStatus.value = clusterConnections.value
  }
  buildTreeData()
}, { deep: true, immediate: true })

watch(searchText, (val) => {
  treeRef.value?.filter(val)
})

const filteredTreeData = computed(() => {
  if (!searchText.value.trim()) {
    return treeData.value
  }
  return filterTreeData(treeData.value, searchText.value.toLowerCase())
})

function filterTreeData(data: TreeNode[], keyword: string): TreeNode[] {
  const result: TreeNode[] = []
  for (const node of data) {
    const matches = node.label.toLowerCase().includes(keyword) ||
      (node.extInfo && node.extInfo.toLowerCase().includes(keyword))
    
    let filteredChildren: TreeNode[] = []
    if (node.children) {
      filteredChildren = filterTreeData(node.children, keyword)
    }

    if (matches || filteredChildren.length > 0) {
      result.push({
        ...node,
        children: filteredChildren.length > 0 ? filteredChildren : node.children
      })
    }
  }
  return result
}

function filterNode(value: string, data: TreeNode) {
  if (!value) return true
  const keyword = value.toLowerCase()
  return data.label.toLowerCase().includes(keyword) ||
    (data.extInfo && data.extInfo.toLowerCase().includes(keyword))
}

async function loadConnections() {
  loading.value = true
  try {
    for (const conid of openedConnections.value) {
      try {
        await serverConnectionsRefreshApi({ conid, keepOpen: true })
      } catch (e) {
        console.error(`刷新连接失败: ${conid}`, e)
      }
    }
    useConnectionList<IActiveConnection[]>(clusterApi.setConnectionList)
    useServerStatus<{ [key: string]: IConnectionStatus }>(serverStatus)
  } finally {
    loading.value = false
  }
}

async function buildTreeData() {
  const tree: TreeNode[] = []
  
  const sortedConnections = sortBy(connectionsWithStatus.value, conn => 
    (getConnectionLabel(conn) || '').toUpperCase()
  )

  for (const conn of sortedConnections) {
    const connectionNode: TreeNode = {
      id: `connection_${conn._id}`,
      label: getConnectionLabel(conn) || conn.server || 'Unknown',
      type: 'connection',
      conid: conn._id,
      extInfo: conn.engine,
      statusIcon: getConnectionStatusIcon(conn),
      statusTitle: (conn as any).status?.message,
      rawData: conn,
      children: []
    }

    if (expandedConnections.value.includes(conn._id)) {
      await loadDatabasesForConnection(connectionNode, conn)
    }

    tree.push(connectionNode)
  }

  treeData.value = tree
}

async function loadDatabasesForConnection(connectionNode: TreeNode, conn: IActiveConnection) {
  try {
    let databases: TablesNameSort[] = []
    
    if ((conn as any).singleDatabase) {
      const name = (conn as any).defaultDatabase || (conn as any).database || 'default'
      databases = [{ name, sortOrder: '0' }]
    } else {
      const dbRef = ref<TablesNameSort[]>([])
      useDatabaseList<TablesNameSort[]>({ conid: String(conn._id) }, dbRef as any)
      await new Promise(resolve => setTimeout(resolve, 100))
      databases = dbRef.value || []
    }

    const sortedDatabases = sortBy(databases, db => db.sortOrder ?? db.name)
    
    connectionNode.children = sortedDatabases.map(db => ({
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
          children: []
        },
        {
          id: `category_${conn._id}_${db.name}_views`,
          label: '视图',
          type: 'category',
          conid: conn._id,
          database: db.name,
          category: 'views',
          children: []
        },
        {
          id: `category_${conn._id}_${db.name}_functions`,
          label: '函数',
          type: 'category',
          conid: conn._id,
          database: db.name,
          category: 'functions',
          children: []
        }
      ]
    }))

    await preloadConnectionStructures(conn._id, connectionNode.children as TreeNode[])
  } catch (e) {
    console.error('加载数据库列表失败', e)
    connectionNode.children = []
  }
}

async function preloadConnectionStructures(conid: string, databaseNodes: TreeNode[]) {
  for (const dbNode of databaseNodes) {
    if (!dbNode.database) continue
    const infoRef = ref<any>(null)
    useDatabaseInfo({ conid, database: dbNode.database }, infoRef)
    let retries = 0
    while (retries < 25 && (!infoRef.value || Object.keys(infoRef.value).length === 0)) {
      await new Promise(resolve => setTimeout(resolve, 200))
      retries++
    }
  }
}

async function loadCategoryObjects(node: TreeNode) {
  if (!node.conid || !node.database || !node.category) return

  try {
    const objectsRef = ref<any>(null)
    useDatabaseInfo({ conid: node.conid, database: node.database }, objectsRef)
    
    let retries = 0
    while (retries < 15 && (!objectsRef.value || Object.keys(objectsRef.value).length === 0)) {
      await new Promise(resolve => setTimeout(resolve, 200))
      retries++
    }
    
    const objects = objectsRef.value || {}
    const objectTypeFields = getObjectTypeFields(node.category)
    const objectList: any[] = []
    
    for (const field of objectTypeFields) {
      const items = objects[field] || []
      for (const obj of items) {
        objectList.push({
          ...obj,
          objectTypeField: field
        })
      }
    }

    const sortedList = sortBy(objectList, ['schemaName', 'pureName'])
    
    node.children = sortedList.map(obj => {
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
        children: []
      }
      
      if (node.category === 'tables' && obj.objectTypeField === 'tables') {
        tableNode.children = [{ 
          id: `columns_placeholder_${tableNode.id}`,
          label: '加载中...',
          type: 'column',
          children: []
        }]
      }
      
      return tableNode
    })
    
    if (node.children.length === 0 && retries >= 15) {
      node.children = [{
        id: `empty_${node.id}`,
        label: '暂无数据，请稍后重试',
        type: 'object',
        children: []
      }]
    }
  } catch (e) {
    console.error('加载对象列表失败', e)
    node.children = [{
      id: `error_${node.id}`,
      label: '加载失败',
      type: 'object',
      children: []
    }]
  }
}

function getObjectTypeFields(category: string): string[] {
  switch (category) {
    case 'tables':
      return ['tables']
    case 'views':
      return ['views', 'matviews']
    case 'functions':
      return ['functions']
    default:
      return []
  }
}

function getConnectionStatusIcon(conn: IActiveConnection): string {
  if (!openedConnections.value.includes(conn._id)) {
    return ''
  }
  const status = (conn as any).status
  if (!status) {
    return 'loading'
  }
  if (status.name === 'ok') {
    return 'ok'
  }
  if (status.name === 'error') {
    return 'error'
  }
  return 'loading'
}

function getStatusIcon(iconType: string) {
  switch (iconType) {
    case 'ok':
      return CircleCheck
    case 'error':
      return CircleClose
    case 'loading':
      return Loading
    default:
      return null
  }
}

async function handleNodeClick(data: TreeNode, node: any) {
  if (data.type === 'connection' && data.conid) {
    const isExpanded = expandedConnections.value.includes(data.conid)
    if (!isExpanded) {
      bootstrap.updateExpandedConnections((old) => [...old, data.conid!])
      bootstrap.updateOpenedConnections((old) => {
        if (!old.includes(data.conid!)) {
          return [...old, data.conid!]
        }
        return old
      })
      
      try {
        await serverConnectionsRefreshApi({ conid: data.conid, keepOpen: true })
      } catch (e) {
        console.error('打开连接失败', e)
      }
      
      const connectionNode = treeData.value.find(n => n.id === `connection_${data.conid}`)
      if (connectionNode) {
        const conn = connectionsWithStatus.value.find(c => c._id === data.conid)
        if (conn) {
          await loadDatabasesForConnection(connectionNode, conn)
          await nextTick()
          treeRef.value?.setCurrentKey(node.key)
          node.expanded = true
        }
      }
    } else {
      bootstrap.updateExpandedConnections((old) => old.filter(id => id !== data.conid))
      node.expanded = false
    }
  }
  
  if (data.type === 'database' && data.conid && data.database) {
    const key = `${data.conid}::${data.database}`
    const isExpanded = expandedConnections.value.includes(key)
    if (!isExpanded) {
      bootstrap.updateExpandedConnections((old) => [...old, key])
      
      try {
        await serverConnectionsRefreshApi({ conid: data.conid, keepOpen: true })
        await databaseConnectionsRefreshApi({ conid: data.conid, database: data.database, keepOpen: true })
        
        await new Promise(resolve => setTimeout(resolve, 300))
        
        if (data.children && data.children.length > 0) {
          const tablesCategory = data.children.find((child: TreeNode) => child.category === 'tables')
          if (tablesCategory) {
            await loadCategoryObjects(tablesCategory)
            await nextTick()
          }
        }
      } catch (e) {
        console.error('刷新数据库结构失败', e)
      }
      node.expanded = true
    } else {
      bootstrap.updateExpandedConnections((old) => old.filter(id => id !== key))
      node.expanded = false
    }
  }
  
  if (data.type === 'category') {
    if (node.expanded && (!data.children || data.children.length === 0)) {
      await loadCategoryObjects(data)
      await nextTick()
      treeRef.value?.setCurrentKey(node.key)
    }
  }
  
  if (data.type === 'object') {
    await handleOpenTableData(data)
  }
}

async function handleNodeExpand(data: TreeNode) {
  if (data.type === 'category' && (!data.children || data.children.length === 0)) {
    await loadCategoryObjects(data)
    await nextTick()
  }
  
  if (data.type === 'object' && data.category === 'tables' && data.objectType === 'tables') {
    if (data.children && data.children.length === 1 && data.children[0].id.includes('columns_placeholder')) {
      await loadTableColumns(data)
      await nextTick()
    }
  }
}

async function loadTableColumns(tableNode: TreeNode) {
  if (!tableNode.conid || !tableNode.database || !tableNode.pureName) return

  try {
    const objectsRef = ref<any>(null)
    useDatabaseInfo({ conid: tableNode.conid, database: tableNode.database }, objectsRef)
    
    let retries = 0
    while (retries < 10 && (!objectsRef.value || !objectsRef.value.tables)) {
      await new Promise(resolve => setTimeout(resolve, 200))
      retries++
    }
    
    const objects = objectsRef.value || {}
    const tables = objects.tables || []
    const table = tables.find((t: any) => 
      (t.pureName === tableNode.pureName) || 
      (t.schemaName === tableNode.schemaName && t.pureName === tableNode.pureName)
    )
    
    if (table && table.columns && Array.isArray(table.columns)) {
      const columns = sortBy(table.columns, (col: any) => 
        col.ordinalPosition ?? col.columnName
      )
      
      tableNode.children = columns.map((col: any) => {
        const typeInfo = col.dataType || col.columnType || ''
        const lengthInfo = col.charMaxLength ? `(${col.charMaxLength})` : 
                          (col.numericPrecision ? `(${col.numericPrecision}${col.numericScale ? ',' + col.numericScale : ''})` : '')
        const nullableInfo = col.isNullable === 'YES' ? ' NULL' : ' NOT NULL'
        
        return {
          id: `column_${tableNode.conid}_${tableNode.database}_${tableNode.pureName}_${col.columnName}`,
          label: col.columnName,
          type: 'column',
          extInfo: `${typeInfo}${lengthInfo}${nullableInfo}`,
          rawData: col
        }
      })
    } else {
      tableNode.children = [{
        id: `column_empty_${tableNode.id}`,
        label: '暂无列信息',
        type: 'column',
        children: []
      }]
    }
  } catch (e) {
    console.error('加载表结构失败', e)
    tableNode.children = [{
      id: `column_error_${tableNode.id}`,
      label: '加载失败',
      type: 'column',
      children: []
    }]
  }
}

async function handleOpenTableData(data: TreeNode) {
  if (!data.conid || !data.database || !data.pureName) {
    ElMessage.warning('缺少必要的信息，无法打开表数据')
    return
  }

  try {
    const connection = await getConnectionInfo({ conid: data.conid })
    const tooltip = `${getConnectionLabel(connection)}\n${data.database}\n${data.pureName}`

    await openNewTab({
      title: data.pureName,
      tooltip,
      icon: 'img table',
      tabComponent: 'TableDataTab',
      props: {
        schemaName: data.schemaName,
        pureName: data.pureName,
        conid: data.conid,
        database: data.database,
        objectTypeField: data.objectType || 'tables',
      },
      selected: true,
      busy: false
    })
  } catch (e) {
    console.error('打开表数据失败', e)
    ElMessage.error('打开表数据失败，请重试')
  }
}

function handleContextMenu(event: MouseEvent, data: TreeNode) {
  event.preventDefault()
  event.stopPropagation()
  contextMenuNode.value = data
  const menuItems = getContextMenuItems(data)
  const items = menuItems.map((m) =>
    m.divider
      ? { divider: true, label: '' }
      : {
          label: m.label,
          disabled: !!m.disabled,
          onClick: () => m.command && handleMenuCommand(m.command),
        }
  )
  createContextMenu({ event, items })
}

function getContextMenuItems(data: TreeNode): any[] {
  const items: any[] = []
  
  if (data.type === 'connection') {
    const conn = connectionsWithStatus.value.find(c => c._id === data.conid)
    const isOpened = conn && openedConnections.value.includes(conn._id)
    
    if (isOpened) {
      items.push({ label: '关闭连接', command: 'disconnect-connection' })
    }
    items.push(
      { label: '编辑连接', command: 'edit-connection' },
      { label: '复制连接', command: 'copy-connection' },
      { label: '新建查询', command: 'new-query' }
    )
    if (isOpened) {
      items.push({ label: '刷新', command: 'refresh-connection' })
    }
    items.push(
      { divider: true },
      { label: '删除', command: 'delete-connection' },
      { label: '创建数据库', command: 'create-database' },
      { label: '服务器概览', command: 'server-summary' }
    )
  } else if (data.type === 'database') {
    const menuItems = getDatabaseMenuItems(data.conid, data.database, openCreateTableModal, bootstrap)
    items.push(...menuItems.map((item: any) => ({
      label: item.text,
      command: item.onClick ? `db-${item.text}` : undefined,
      divider: item.divider,
      onClick: item.onClick
    })))
  } else if (data.type === 'object' && data.category === 'tables') {
    items.push(
      {
        label: '打开表',
        command: 'open-table'
      },
      {
        label: '新建表',
        command: 'create-table'
      },
      {
        label: '删除表',
        command: 'drop-table'
      },
      {
        label: '清空表',
        command: 'truncate-table'
      }
    )
  }
  
  return items
}

async function handleMenuCommand(command: string) {
  const node = contextMenuNode.value
  if (!node) return
  
  try {
    switch (command) {
      case 'edit-connection':
        await handleEditConnection(node)
        break
      case 'delete-connection':
        await handleDeleteConnection(node)
        break
      case 'refresh-connection':
        await handleRefreshConnection(node)
        break
      case 'disconnect-connection':
        await handleDisconnectConnection(node)
        break
      case 'copy-connection':
        await handleCopyConnection(node)
        break
      case 'new-query':
        handleNewQuery(node)
        break
      case 'create-database':
        handleCreateDatabase(node)
        break
      case 'server-summary':
        await handleServerSummary(node)
        break
      case 'open-table':
        await handleOpenTableData(node)
        break
      case 'create-table':
        handleCreateTable(node)
        break
      case 'drop-table':
        await handleDropTable(node)
        break
      case 'truncate-table':
        await handleTruncateTable(node)
        break
      default:
        if (command.startsWith('db-')) {
          const menuItems = getDatabaseMenuItems(node.conid, node.database, openCreateTableModal, bootstrap)
          const item = menuItems.find((item: any) => `db-${item.text}` === command)
          if (item?.onClick) {
            item.onClick()
          }
        }
    }
  } catch (e: any) {
    console.error('执行菜单命令失败', e)
    ElMessage.error(e?.message || '操作失败')
  }
  
  contextMenuVisible.value = false
}

function handleMenuVisibleChange(visible: boolean) {
  if (!visible) {
    contextMenuNode.value = null
  }
}

async function handleEditConnection(node: TreeNode) {
  const conn = connectionsWithStatus.value.find(c => c._id === node.conid)
  const isOpened = conn && openedConnections.value.includes(conn._id)
  
  if (isOpened) {
    await handleServerSummary(node)
  } else {
    const payload = conn ? { ...conn } : { _id: node.conid }
    window.dispatchEvent(new CustomEvent('open-connection-modal', { detail: payload }))
  }
}

async function handleDeleteConnection(node: TreeNode) {
  const conn = connectionsWithStatus.value.find(c => c._id === node.conid)
  const connLabel = conn ? getConnectionLabel(conn) : node.label
  
  await ElMessageBox.confirm(
    `确定要删除连接 "${connLabel}" 吗？`,
    '删除确认',
    {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning',
    }
  )
  
  try {
    await connectionDeleteApi({ _id: node.conid })
    ElMessage.success('连接已删除')
    loadConnections()
  } catch (e: any) {
    ElMessage.error(`删除失败：${e?.message || String(e)}`)
  }
}

async function handleRefreshConnection(node: TreeNode) {
  try {
    await serverConnectionsRefreshApi({ conid: node.conid, keepOpen: true })
    ElMessage.success('连接已刷新')
    loadConnections()
  } catch (e: any) {
    ElMessage.error(`刷新失败：${e?.message || String(e)}`)
  }
}

async function handleDisconnectConnection(node: TreeNode) {
  const conn = connectionsWithStatus.value.find(c => c._id === node.conid)
  if (conn) {
    disconnectServerConnection(conn, true)
  }
}

async function handleCopyConnection(node: TreeNode) {
  const conn = connectionsWithStatus.value.find(c => c._id === node.conid)
  const text = conn ? getConnectionLabel(conn) : node.label
  try {
    await navigator.clipboard.writeText(text)
    ElMessage.success('已复制到剪贴板')
  } catch {
    ElMessage.error('复制失败')
  }
}

function handleNewQuery(node: TreeNode) {
  const conn = connectionsWithStatus.value.find(c => c._id === node.conid)
  const title = conn ? `${getConnectionLabel(conn)} - 查询#` : '新建查询#'
  openNewTab(
    {
      title,
      icon: 'icon query',
      tabComponent: 'SqlQueryTab',
      props: { conid: node.conid },
      selected: true,
      busy: false
    },
    undefined,
    { forceNewTab: true }
  )
}

function handleCreateDatabase(node: TreeNode) {
  openCreateDatabaseModal(true, { conid: node.conid })
}

async function handleServerSummary(node: TreeNode) {
  const conn = connectionsWithStatus.value.find(c => c._id === node.conid)
  if (!conn) return
  
  await openNewTab({
    title: getConnectionLabel(conn),
    icon: 'img server',
    tabComponent: 'ServerSummaryTab',
    props: {
      conid: node.conid,
    },
    selected: true,
    busy: false
  })
}

async function handleDropTable(node: TreeNode) {
  const tableName = node.schemaName 
    ? `${node.schemaName}.${node.pureName}` 
    : node.pureName
  
  await ElMessageBox.confirm(
    `确定要删除表 "${tableName}" 吗？此操作不可恢复！`,
    '删除确认',
    {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning',
    }
  )
  
  try {
    const { findEngineDriver } = await import('/@/second/tinydb-tools')
    const { extensions } = storeToRefs(bootstrap)
    const connection = await getConnectionInfo({ conid: node.conid })
    
    if (!connection) {
      ElMessage.error('无法获取数据库连接信息')
      return
    }
    
    const driver = findEngineDriver(connection, extensions.value!)
    if (!driver) {
      ElMessage.error('无法获取数据库驱动')
      return
    }
    
    const dumper = driver.createDumper()
    ;(dumper as any).dropTable({
      schemaName: node.schemaName,
      pureName: node.pureName,
      columns: [],
      primaryKey: null,
      foreignKeys: [],
      indexes: []
    } as any)
    const sql = dumper.s

    const response = await databaseConnectionsSqlSelectApi({
      conid: node.conid!,
      database: node.database!,
      select: { sql }
    }) as any

    if (response?.errorMessage) {
      ElMessage.error(`删除表失败：${response.errorMessage}`)
    } else {
      ElMessage.success('表已删除')
      try {
        await databaseConnectionsRefreshApi({
          conid: node.conid!,
          database: node.database!,
          keepOpen: true
        })
        const categoryNode = treeData.value
          .flatMap(c => c.children || [])
          .flatMap(db => db.children || [])
          .find(cat => cat.category === 'tables' && cat.conid === node.conid && cat.database === node.database)
        if (categoryNode) {
          await loadCategoryObjects(categoryNode)
        }
      } catch (e) {
        console.warn('刷新数据库结构失败', e)
      }
    }
  } catch (e: any) {
    ElMessage.error(`删除表失败：${e?.message || String(e)}`)
  }
}

async function handleTruncateTable(node: TreeNode) {
  const tableName = node.schemaName 
    ? `${node.schemaName}.${node.pureName}` 
    : node.pureName
  
  await ElMessageBox.confirm(
    `确定要清空表 "${tableName}" 的所有数据吗？此操作不可恢复！`,
    '清空确认',
    {
      confirmButtonText: '清空',
      cancelButtonText: '取消',
      type: 'warning',
    }
  )
  
  try {
    const { findEngineDriver } = await import('/@/second/tinydb-tools')
    const { extensions } = storeToRefs(bootstrap)
    const connection = await getConnectionInfo({ conid: node.conid })
    
    if (!connection) {
      ElMessage.error('无法获取数据库连接信息')
      return
    }
    
    const driver = findEngineDriver(connection, extensions.value!)
    if (!driver) {
      ElMessage.error('无法获取数据库驱动')
      return
    }
    
    const dumper = driver.createDumper()
    dumper.truncateTable({
      schemaName: node.schemaName,
      pureName: node.pureName
    })
    const sql = dumper.s

    const response = await databaseConnectionsSqlSelectApi({
      conid: node.conid!,
      database: node.database!,
      select: { sql }
    }) as any

    if (response?.errorMessage) {
      ElMessage.error(`清空表失败：${response.errorMessage}`)
    } else {
      ElMessage.success('表已清空')
    }
  } catch (e: any) {
    ElMessage.error(`清空表失败：${e?.message || String(e)}`)
  }
}

function handleCreateTable(node: TreeNode) {
  if (node.conid && node.database) {
    openCreateTableModal(true, { conid: node.conid, database: node.database })
  }
}

onMounted(() => {
  useConnectionList<IActiveConnection[]>(clusterApi.setConnectionList)
  useServerStatus<{ [key: string]: IConnectionStatus }>(serverStatus)
  loadConnections()
})

onBeforeUnmount(() => {
})
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

.database-icon {
  color: #67C23A;
  font-size: 20px;
}

.category-icon {
  color: #E6A23C;
  font-size: 20px;
}

.object-icon {
  color: #409EFF;
  font-size: 20px;
}

.column-icon {
  color: #909399;
  font-size: 14px;
}

.node-label {
  flex: 1;
  color: var(--theme-font-1);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.node-ext-info {
  margin-left: 8px;
  font-size: 12px;
  color: var(--theme-font-2);
  flex-shrink: 0;
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
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

:deep(.el-tree-node__content) {
  height: 28px;
  cursor: pointer;
  position: relative;
  display: flex;
  align-items: center;
  gap: 8px;
}

:deep(.el-tree-node__content:hover) {
  background-color: var(--theme-bg-hover);
}

:deep(.el-tree-node.is-current > .el-tree-node__content) {
  background-color: var(--theme-bg-selected);
}

/* 展开/折叠用加减号表示，方框包裹，完全隐藏默认三角图标 */
:deep(.el-tree-node__expand-icon::before) {
  content: "+";
  font-size: 13px;
  line-height: 0;
  font-weight: normal;
}
:deep(.el-tree-node__expand-icon.expanded::before) {
  content: "−";
}
:deep(.el-tree-node__expand-icon.is-leaf) {
  border-color: transparent;
  background: transparent;
  color: transparent;
  visibility: hidden;
}
:deep(.el-tree-node__expand-icon.is-leaf::before) {
  content: none;
}

/* 虚线连接线：所有层级的父子节点展开后都显示，竖线在子节点容器左侧，横线从竖线连到当前节点 */
:deep(.el-tree-node.is-expanded > .el-tree-node__children) {
  overflow: visible;
}
:deep(.el-tree-node__children) {
  position: relative;
}
:deep(.el-tree-node__children::before) {
  content: "";
  position: absolute;
  left: 9px;
  top: 0;
  bottom: 0;
  border-left: 1px dotted var(--el-border-color);
  pointer-events: none;
}

:deep(.el-tree-node:first-child > .el-tree-node__content::before) {
  display: none;
}
</style>
