import {computed, defineComponent, PropType, toRefs, unref} from 'vue'
import {isNaN} from 'lodash-es'
import {filterName, findEngineDriver} from '/@/second/tinydb-tools'
import AppObjectCore from '/@/second/appobj/AppObjectCore.vue'
import {useLocaleStore} from '/@/store/modules/locale'
import {storeToRefs} from "pinia"
import {getConnectionInfo} from '/@/api/bridge'
import fullDisplayName from '/@/second/utility/fullDisplayName'
import getConnectionLabel from '/@/second/utility/getConnectionLabel'
import openNewTab from '/@/second/utility/openNewTab'
import {message, Modal} from 'ant-design-vue'
import {databaseConnectionsSqlSelectApi, databaseConnectionsRefreshApi} from '/@/api/simpleApis'
import {useBootstrapStore} from '/@/store/modules/bootstrap'
import {useModal} from '/@/components/Modal'
import CreateTableModal from '/@/second/modals/CreateTableModal.vue'
import type {ContextMenuItem} from '/@/second/modals/typing'

export const extractKey = ({schemaName, pureName}) =>
  (schemaName ? `${schemaName}.${pureName}` : pureName)
export const createMatcher = ({schemaName, pureName, columns}) => filter =>
  filterName(unref(filter), pureName, schemaName, ...(columns?.map(({columnName}) => ({childName: columnName})) || []))
const createTitle = ({pureName}) => pureName
export const databaseObjectIcons = {
  tables: 'img table',
  collections: 'img collection',
  views: 'img view',
  matviews: 'img view',
  procedures: 'img procedure',
  functions: 'img function',
  queries: 'img query-data',
}
export const defaultTabs = {
  tables: 'TableDataTab',
  collections: 'CollectionDataTab',
  views: 'ViewDataTab',
  matviews: 'ViewDataTab',
  queries: 'QueryDataTab',
}
export const menus = {
  tables: [
    {
      label: '打开表',
      isOpenTable: true,
    },
    {
      label: '新建表',
      isCreateTable: true,
    },
    {
      label: '删除表',
      isDropTable: true,
    },
    {
      label: '清空表',
      isTruncateTable: true,
    },
    {
      divider: true,
    },
    {
      label: 'Open data',
      tab: 'TableDataTab',
      forceNewTab: true,
    },
    {
      label: 'Open form',
      tab: 'TableDataTab',
      forceNewTab: true,
      initialData: {
        grid: {
          isFormView: true,
        },
      },
    },
    {
      label: 'Open structure',
      tab: 'TableStructureTab',
      icon: 'img table-structure',
    },
    {
      label: 'Open perspective',
      tab: 'PerspectiveTab',
      forceNewTab: true,
      icon: 'img perspective',
    },
    {
      divider: true,
    },
    {
      label: 'Drop table',
      isDrop: true,
      requiresWriteAccess: true,
    },
    {
      label: 'Rename table',
      isRename: true,
      requiresWriteAccess: true,
    },
    {
      label: 'Create table backup',
      isDuplicateTable: true,
      requiresWriteAccess: true,
    },
    {
      label: 'Query designer',
      isQueryDesigner: true,
      requiresWriteAccess: true,
    },
    {
      label: 'Show diagram',
      isDiagram: true,
    },
    {
      divider: true,
    },
    {
      label: 'Export',
      functionName: 'tableReader',
      isExport: true,
    },
    {
      label: 'Import',
      isImport: true,
      requiresWriteAccess: true,
    },
    {
      label: 'Open as data sheet',
      isOpenFreeTable: true,
    },
    {
      label: 'Open active chart',
      isActiveChart: true,
    },
    {
      divider: true,
    },
    {
      label: 'SQL: CREATE TABLE',
      scriptTemplate: 'CREATE TABLE',
    },
    {
      label: 'SQL: SELECT',
      scriptTemplate: 'SELECT',
    },
    {
      label: 'SQL Generator: CREATE TABLE',
      sqlGeneratorProps: {
        createTables: true,
        createIndexes: true,
        createForeignKeys: true,
      },
    },
    {
      label: 'SQL Generator: DROP TABLE',
      sqlGeneratorProps: {
        dropTables: true,
        dropReferences: true,
      },
    },
    {
      label: 'SQL Generator: INSERT',
      sqlGeneratorProps: {
        insert: true,
      },
    },
  ],
  views: [
    {
      label: 'Open data',
      tab: 'ViewDataTab',
      forceNewTab: true,
    },
    {
      label: 'Open structure',
      tab: 'TableStructureTab',
      icon: 'img view-structure',
    },
    {
      label: 'Open perspective',
      tab: 'PerspectiveTab',
      forceNewTab: true,
      icon: 'img perspective',
    },
    {
      label: 'Drop view',
      isDrop: true,
    },
    {
      label: 'Query designer',
      isQueryDesigner: true,
    },
    {
      divider: true,
    },
    {
      label: 'Export',
      isExport: true,
      functionName: 'tableReader',
    },
    {
      label: 'Open as data sheet',
      isOpenFreeTable: true,
    },
    {
      label: 'Open active chart',
      isActiveChart: true,
    },
    {
      divider: true,
    },
    {
      label: 'SQL: CREATE VIEW',
      scriptTemplate: 'CREATE OBJECT',
    },
    {
      label: 'SQL: CREATE TABLE',
      scriptTemplate: 'CREATE TABLE',
    },
    {
      label: 'SQL: SELECT',
      scriptTemplate: 'SELECT',
    },
    {
      label: 'SQL Generator: CREATE VIEW',
      sqlGeneratorProps: {
        createViews: true,
      },
    },
    {
      label: 'SQL Generator: DROP VIEW',
      sqlGeneratorProps: {
        dropViews: true,
      },
    },
  ],
  matviews: [
    {
      label: 'Open data',
      tab: 'ViewDataTab',
      forceNewTab: true,
    },
    {
      label: 'Open structure',
      tab: 'TableStructureTab',
    },
    {
      label: 'Drop view',
      isDrop: true,
    },
    {
      label: 'Query designer',
      isQueryDesigner: true,
    },
    {
      divider: true,
    },
    {
      label: 'Export',
      isExport: true,
      functionName: 'tableReader',
    },
    {
      label: 'Open as data sheet',
      isOpenFreeTable: true,
    },
    {
      label: 'Open active chart',
      isActiveChart: true,
    },
    {
      divider: true,
    },
    {
      label: 'SQL: CREATE MATERIALIZED VIEW',
      scriptTemplate: 'CREATE OBJECT',
    },
    {
      label: 'SQL: CREATE TABLE',
      scriptTemplate: 'CREATE TABLE',
    },
    {
      label: 'SQL: SELECT',
      scriptTemplate: 'SELECT',
    },
    {
      label: 'SQL Generator: CREATE MATERIALIZED VIEW',
      sqlGeneratorProps: {
        createMatviews: true,
      },
    },
    {
      label: 'SQL Generator: DROP MATERIALIZED VIEW',
      sqlGeneratorProps: {
        dropMatviews: true,
      },
    },
  ],
  queries: [
    {
      label: 'Open data',
      tab: 'QueryDataTab',
      forceNewTab: true,
    },
  ],
  procedures: [
    {
      label: 'Drop procedure',
      isDrop: true,
    },
    {
      label: 'SQL: CREATE PROCEDURE',
      scriptTemplate: 'CREATE OBJECT',
    },
    {
      label: 'SQL: EXECUTE',
      scriptTemplate: 'EXECUTE PROCEDURE',
    },
    {
      label: 'SQL Generator: CREATE PROCEDURE',
      sqlGeneratorProps: {
        createProcedures: true,
      },
    },
    {
      label: 'SQL Generator: DROP PROCEDURE',
      sqlGeneratorProps: {
        dropProcedures: true,
      },
    },
  ],
  functions: [
    {
      label: 'Drop function',
      isDrop: true,
    },
    {
      label: 'SQL: CREATE FUNCTION',
      scriptTemplate: 'CREATE OBJECT',
    },
    {
      label: 'SQL Generator: CREATE FUNCTION',
      sqlGeneratorProps: {
        createFunctions: true,
      },
    },
    {
      label: 'SQL Generator: DROP FUNCTION',
      sqlGeneratorProps: {
        dropFunctions: true,
      },
    },
  ],
  collections: [
    {
      label: 'Open data',
      tab: 'CollectionDataTab',
      forceNewTab: true,
    },
    {
      label: 'Open JSON',
      tab: 'CollectionDataTab',
      forceNewTab: true,
      initialData: {
        grid: {
          isJsonView: true,
        },
      },
    },
    {
      label: 'Export',
      isExport: true,
      functionName: 'tableReader',
    },
    {
      label: 'Drop collection',
      isDropCollection: true,
    },
    {
      label: 'Rename collection',
      isRenameCollection: true,
    },
    {
      divider: true,
    },
    {
      label: 'JS: dropCollection()',
      scriptTemplate: 'dropCollection',
    },
    {
      label: 'JS: find()',
      scriptTemplate: 'findCollection',
    },
  ],
}

function testEqual(a, b) {
  return (
    a.conid == b.conid &&
    a.database == b.database &&
    a.objectTypeField == b.objectTypeField &&
    a.pureName == b.pureName &&
    a.schemaName == b.schemaName
  );
}

function formatRowCount(value) {
  const num = parseInt(value);
  if (isNaN(num)) return value;
  return num.toLocaleString();
}

export default defineComponent({
  name: 'DatabaseObjectAppObject',
  props: {
    data: {
      type: Object as PropType<{ name: string, schemaName: string, objectTypeField: string, pureName: string, tableRowCount?: null }>,
    },
    passProps: {
      type: Object as PropType<{
        showPinnedInsteadOfUnpin: boolean
      }>,
    },
  },
  emits: ['middleclick'],
  setup(props, {attrs}) {
    const {data, passProps} = toRefs(props)

    const localeStore = useLocaleStore()
    const {pinnedTables} = storeToRefs(localeStore)
    const bootstrap = useBootstrapStore()
    const {extensions} = storeToRefs(bootstrap)

    const [registerCreateTableModal, { openModal: openCreateTableModal }] = useModal()

    const isPinned = computed(() => !!unref(pinnedTables).find(x => testEqual(unref(data), unref(x))))

    function handleClick(forceNewTab = false) {
      handleDatabaseObjectClick(data.value, forceNewTab)
    }

    async function handleOpenTable() {
      handleDatabaseObjectClick(data.value, false)
    }

    function handleCreateTable() {
      if (data.value?.conid && data.value?.database) {
        openCreateTableModal(true, { conid: data.value.conid, database: data.value.database })
      }
    }

    async function handleDropTable() {
      const tableName = data.value?.schemaName 
        ? `${data.value.schemaName}.${data.value.pureName}` 
        : data.value?.pureName
      
      Modal.confirm({
        title: '删除表',
        content: `确定要删除表 "${tableName}" 吗？此操作不可恢复！`,
        okText: '删除',
        okType: 'danger',
        cancelText: '取消',
        onOk: async () => {
          try {
            const connection = await getConnectionInfo({conid: data.value?.conid})
            if (!connection) {
              message.error('无法获取数据库连接信息')
              return
            }
            const driver = findEngineDriver(connection, extensions.value!)
            if (!driver) {
              message.error('无法获取数据库驱动')
              return
            }
            const dumper = driver.createDumper()
            dumper.dropTable({
              schemaName: data.value?.schemaName,
              pureName: data.value?.pureName,
              columns: [],
              primaryKey: null,
              foreignKeys: [],
              indexes: []
            } as any)
            const sql = dumper.s

            const response = await databaseConnectionsSqlSelectApi({
              conid: data.value!.conid!,
              database: data.value!.database!,
              select: {sql}
            }) as any

            if (response?.errorMessage) {
              message.error(`删除表失败：${response.errorMessage}`)
            } else {
              message.success('表已删除')
              // 刷新数据库结构
              try {
                await databaseConnectionsRefreshApi({
                  conid: data.value!.conid!,
                  database: data.value!.database!,
                  keepOpen: true
                })
              } catch (e) {
                console.warn('刷新数据库结构失败', e)
              }
            }
          } catch (e: any) {
            message.error(`删除表失败：${e?.message || String(e)}`)
          }
        }
      })
    }

    async function handleTruncateTable() {
      const tableName = data.value?.schemaName 
        ? `${data.value.schemaName}.${data.value.pureName}` 
        : data.value?.pureName
      
      Modal.confirm({
        title: '清空表',
        content: `确定要清空表 "${tableName}" 的所有数据吗？此操作不可恢复！`,
        okText: '清空',
        okType: 'danger',
        cancelText: '取消',
        onOk: async () => {
          try {
            const connection = await getConnectionInfo({conid: data.value?.conid})
            if (!connection) {
              message.error('无法获取数据库连接信息')
              return
            }
            const driver = findEngineDriver(connection, extensions.value!)
            if (!driver) {
              message.error('无法获取数据库驱动')
              return
            }
            const dumper = driver.createDumper()
            dumper.truncateTable({
              schemaName: data.value?.schemaName,
              pureName: data.value?.pureName
            })
            const sql = dumper.s

            const response = await databaseConnectionsSqlSelectApi({
              conid: data.value!.conid!,
              database: data.value!.database!,
              select: {sql}
            }) as any

            if (response?.errorMessage) {
              message.error(`清空表失败：${response.errorMessage}`)
            } else {
              message.success('表已清空')
            }
          } catch (e: any) {
            message.error(`清空表失败：${e?.message || String(e)}`)
          }
        }
      })
    }

    function createMenu(): ContextMenuItem[] {
      if (data.value?.objectTypeField !== 'tables') {
        return []
      }

      const menuItems: ContextMenuItem[] = [
        {
          label: '打开表',
          onClick: handleOpenTable
        },
        {
          label: '新建表',
          onClick: handleCreateTable
        },
        {
          label: '删除表',
          onClick: handleDropTable
        },
        {
          label: '清空表',
          onClick: handleTruncateTable
        },
        {
          divider: true
        }
      ]

      return menuItems
    }

    return () => (
      <>
        <AppObjectCore
          {...attrs}
          data={data.value}
          title={data.value!.schemaName ? `${data.value!.schemaName}.${data.value!.pureName}` : data.value!.pureName}
          icon={databaseObjectIcons[data.value!.objectTypeField]}
          showPinnedInsteadOfUnpin={passProps.value?.showPinnedInsteadOfUnpin}
          pin={isPinned.value ? null : () => localeStore.updatePinnedTables(list => [...list, data.value])}
          unpin={isPinned.value ? () => localeStore.updatePinnedTables(list => list.filter(x => !testEqual(x, data.value))) : null}
          extInfo={data.value!.tableRowCount != null ? `${formatRowCount(data.value!.tableRowCount)} rows` : null}
          onClick={() => handleClick()}
          onMiddleclick={() => handleClick(true)}
          menu={createMenu}
        />
        {data.value?.objectTypeField === 'tables' && (
          <CreateTableModal onRegister={registerCreateTableModal} />
        )}
      </>
    )
  },
  extractKey,
  createMatcher,
  createTitle,
  databaseObjectIcons,
  defaultTabs,
  menus
})

export async function openDatabaseObjectDetail(
  tabComponent,
  scriptTemplate,
  {schemaName, pureName, conid, database, objectTypeField},
  forceNewTab?,
  initialData?,
  icon?,
  appObjectData?
) {
  const connection = await getConnectionInfo({conid})
  const tooltip = `${getConnectionLabel(connection)}\n${database}\n${fullDisplayName({
    schemaName,
    pureName,
  })}`

  await openNewTab(
    {
      title: scriptTemplate ? 'Query #' : pureName,
      tooltip,
      icon: icon || (scriptTemplate ? 'img sql-file' : databaseObjectIcons[objectTypeField]),
      tabComponent: scriptTemplate ? 'QueryTab' : tabComponent,
      appObject: 'DatabaseObjectAppObject',
      appObjectData,
      props: {
        schemaName,
        pureName,
        conid,
        database,
        objectTypeField,
        initialArgs: scriptTemplate ? {scriptTemplate} : null,
      },
    },
    initialData,
    {forceNewTab}
  )
}

export function handleDatabaseObjectClick(data, forceNewTab = false) {
  const schemaNameRaw = data?.schemaName
  const pureNameRaw = data?.pureName
  const schemaName = (typeof schemaNameRaw === 'string' && schemaNameRaw.trim() === '') ? undefined : schemaNameRaw
  const pureName = (typeof pureNameRaw === 'string') ? pureNameRaw.trim() : pureNameRaw
  const {conid, database, objectTypeField} = data

  if (!pureName) {
    message.error('表名为空，无法打开表数据（pureName is empty）')
    return
  }
  // const configuredAction = getCurrentSettings()[`defaultAction.dbObjectClick.${objectTypeField}`];
  const configuredAction = undefined
  const overrideMenu = menus[objectTypeField].find(x => x.label && x.label == configuredAction);
  if (overrideMenu) {
    void databaseObjectMenuClickHandler(data, overrideMenu);
    return
  }

  void openDatabaseObjectDetail(
    defaultTabs[objectTypeField],
    defaultTabs[objectTypeField] ? null : 'CREATE OBJECT',
    {
      schemaName,
      pureName,
      conid,
      database,
      objectTypeField,
    },
    forceNewTab,
    null,
    null,
    data
  );
}

async function databaseObjectMenuClickHandler(data, menu) {
  console.log(data, menu)
  // const getDriver = async () => {
  //   const conn = await getConnectionInfo(data);
  //   if (!conn) return;
  //   const driver = findEngineDriver(conn, getExtensions());
  //   return driver;
  // }
}
