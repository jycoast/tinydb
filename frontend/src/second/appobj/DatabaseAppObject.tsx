import {defineComponent, PropType, toRefs, unref} from 'vue'
import {storeToRefs} from 'pinia'
import {get} from 'lodash-es'
import AppObjectCore from './AppObjectCore.vue'
import {useBootstrapStore} from "/@/store/modules/bootstrap"
import {IPinnedDatabasesItem} from "/@/second/typings/types/standard.d"
import CreateTableModal from '/@/second/modals/CreateTableModal.vue'
import { useModal } from '/@/components/Modal'
import {databaseConnectionsRefreshApi} from '/@/api/simpleApis'
import {Modal, message} from 'ant-design-vue'
import openNewTab from '/@/second/utility/openNewTab';

export default defineComponent({
  name: 'DatabaseAppObject',
  props: {
    data: {
      type: Object as PropType<IPinnedDatabasesItem>,
    },
    passProps: {
      type: Object as PropType<{
        showPinnedInsteadOfUnpin: boolean
      }>,
    },
  },
  setup(props, {attrs}) {
    const {data, passProps} = toRefs(props)

    const bootstrap = useBootstrapStore()
    const {getCurrentDatabase: currentDatabase} = storeToRefs(bootstrap)

    const [registerCreateTableModal, { openModal: openCreateTableModal }] = useModal()

    const createMenu = () => {
      return getDatabaseMenuItems(
        data.value?.connection?._id,
        data.value?.name,
        openCreateTableModal,
        bootstrap
      )
    }

    return () => (
      <>
        <AppObjectCore
          {...attrs}
          title={unref(data)!.name}
          extInfo={unref(data)!.extInfo}
          icon="img database"
          isBold={get(unref(currentDatabase), 'connection._id') == get(data.value!.connection, '_id') &&
            get(unref(currentDatabase), 'name') == data.value!.name
          }
          onClick={() => bootstrap.setCurrentDatabase(data.value!)}
          menu={createMenu}
          showPinnedInsteadOfUnpin={unref(passProps)?.showPinnedInsteadOfUnpin}
        />
        <CreateTableModal onRegister={registerCreateTableModal} />
      </>
    )
  }
})

export function getDatabaseMenuItems(conid?: string, database?: string, openCreateTableModal?: (visible: boolean, data?: any) => void, bootstrap?: ReturnType<typeof useBootstrapStore>) {
  const handleNewQuery = () => {
  }

  const handleNewTable = () => {
    if (openCreateTableModal && conid && database) {
      openCreateTableModal(true, { conid, database })
    } else {
      // Fallback to runCommand
      const runCommand = require('/@/second/commands/runCommand').default
      runCommand('new.table')
    }
  }

  const handleNewCollection = () => {
  }

  const handleImport = () => {

  }
  const handleExport = () => {

  }

  const handleSqlRestore = () => {
  }

  const handleSqlDump = () => {

  }

  const handleCloseDatabase = () => {
    if (!conid || !database) return

    Modal.confirm({
      title: '关闭数据库',
      content: `确定要关闭数据库 "${database}" 吗？`,
      okText: '关闭',
      cancelText: '取消',
      onOk: async () => {
        try {
          await databaseConnectionsRefreshApi({
            conid,
            database,
            keepOpen: false
          })
          
          // 如果当前数据库是正在关闭的数据库，则清除当前数据库
          if (bootstrap) {
            const current = bootstrap.currentDatabase as any
            if (current?.connection?._id === conid && current?.name === database) {
              bootstrap.setCurrentDatabase(null)
            }
          }
          
          message.success('数据库已关闭')
        } catch (e: any) {
          message.error(`关闭数据库失败：${e?.message || String(e)}`)
        }
      }
    })
  }

  return [
    {onClick: handleNewQuery, text: '新建查询', isNewQuery: true},
    {onClick: handleNewTable, text: '新建表'},
    {onClick: handleNewCollection, text: '新建集合'},
    {onClick: handleImport, text: '导入向导'},
    {onClick: handleExport, text: '导出向导'},
    {onClick: handleSqlRestore, text: '恢复/导入 SQL 转储'},
    {onClick: handleSqlDump, text: '备份/导出 SQL 转储'},
    {divider: true},
    {onClick: handleCloseDatabase, text: '关闭数据库'},
  ]
}
