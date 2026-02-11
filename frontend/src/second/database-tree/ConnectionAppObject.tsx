import {createVNode, defineComponent, onMounted, PropType, ref, toRaw, toRefs, unref, watch} from 'vue'
import {storeToRefs} from 'pinia'
import {filterName} from '/@/second/tinydb-tools'
import {Modal, message} from "ant-design-vue";
import {ExclamationCircleOutlined} from "@ant-design/icons-vue";
import {getLocalStorage} from '/@/second/utility/storageCache'
import {removeLocalStorage} from '/@/second/utility/storageCache'
import {useBootstrapStore} from "/@/store/modules/bootstrap"
import {get, uniq} from 'lodash-es'
import AppObjectCore from '/@/components/AppObject/AppObjectCore.vue'
import getConnectionLabel from '/@/second/utility/getConnectionLabel'
import {ConnectionsWithStatus} from '/@/second/typings/mysql'
import {IPinnedDatabasesItem} from '/@/second/typings/types/standard.d'
import {
  connectionDeleteApi,
  databaseConnectionsRefreshApi,
  serverConnectionsRefreshApi
} from '/@/api/simpleApis'
import openNewTab from '/@/second/utility/openNewTab'
import CreateDatabaseModal from '/@/second/modals/CreateDatabaseModal.vue'
import { useModal } from '/@/components/Modal'

export default defineComponent({
  name: 'ConnectionAppObject',
  props: {
    data: {
      type: Object as PropType<ConnectionsWithStatus>,
    },
    passProps: {
      type: Object as PropType<{ showPinnedInsteadOfUnpin: boolean }>,
      default: () => {
        return {showPinnedInsteadOfUnpin: true}
      }
    },
    statusIcon: {
      type: String as PropType<string>
    },
    statusTitle: {
      type: String as PropType<string>
    },
    extInfo: {
      type: String as PropType<string>
    },
    engineStatusIcon: {
      type: String as PropType<string>
    },
    engineStatusTitle: {
      type: String as PropType<string>
    },
  },
  setup(props, {attrs}) {
    const {
      data,
      extInfo,
      engineStatusIcon,
      engineStatusTitle,
      statusIcon,
      statusTitle,
    } = toRefs(props)
    const statusTitleRef = ref()
    const statusIconRef = ref()
    const extInfoRef = ref()
    const engineStatusIconRef = ref()
    const engineStatusTitleRef = ref()
    const bootstrap = useBootstrapStore()
    const {extensions, openedConnections, currentDatabase} = storeToRefs(bootstrap)
    // let timerId: ReturnType<typeof setTimeout> | null

    const handleConnect = () => {
      openConnection(data.value, bootstrap)
    }

    watch(() => [data.value, extensions.value], () => {
      if (extensions.value?.drivers.find(x => x.engine == data.value?.engine)) {
        const match = (unref(data)!.engine || '').match(/^([^@]*)@/)
        extInfoRef.value = match ? match[1] : unref(data)!.engine;
        engineStatusIconRef.value = null
        engineStatusTitleRef.value = null
      } else {
        extInfo.value = data.value?.engine
        engineStatusIconRef.value = 'img warn'
        engineStatusTitleRef.value = `Engine driver ${data.value?.engine} not found, review installed plugins and change engine in edit connection dialog`
      }
    }, {
      immediate: true,
    })

    watch(() => [data.value, openedConnections.value], () => {
      const {_id, status} = unref(data)!
      if (openedConnections.value.includes(_id)) {
        if (!status) statusIconRef.value = 'icon loading'
        else if (status.name == 'pending') statusIconRef.value = 'icon loading';
        else if (status.name == 'ok') statusIconRef.value = 'img ok';
        else statusIconRef.value = 'img error';
        if (status && status.name == 'error') {
          statusTitleRef.value = status.message
        }
      } else {
        statusIconRef.value = null
        statusTitleRef.value = null
      }
    }, {
      immediate: true
    })

    onMounted(() => {
      // dataBase.setExtensions(buildExtensions() as any)
      statusTitleRef.value = unref(statusTitle)
      statusIconRef.value = unref(statusIcon)
      extInfoRef.value = unref(extInfo)
      engineStatusIconRef.value = unref(engineStatusIcon)
      engineStatusTitleRef.value = unref(engineStatusTitle)
    })

    const handleDelete = async () => {
      const r = Modal.confirm({
        title: 'Confirm',
        icon: createVNode(ExclamationCircleOutlined),
        content: `Really delete connection ${getConnectionLabel(data.value)}${data.value?.port ? '_' + data.value?.port : ''}?`,
        okText: 'Ok',
        cancelText: 'Cancel',
        onOk: async () => {
          try {
            await connectionDeleteApi({_id: data.value?._id})
            // todo 暂时不使用删除连接池并判断是否为当前连接并清楚
            // await bootstrap.removeCurrentDatabase(data.value?._id)
            r.destroy()
          } catch (e) {
            console.log(e)
          }
        },
        onCancel: () => r.destroy(),
      })
    }

    // const addWailsEventListener = () => {
    //   EventsOn("connection-list-changed", data => {
    //     console.log(data, 'connections/list');
    //     console.log(data, 'connections/get');
    //   })
    // }

    const handleClick = async () => {
      // handleConnect()
    }

    const handleSqlRestore = () => {

    }

    const [registerCreateDatabaseModal, { openModal: openCreateDatabaseModal }] = useModal()
    
    const handleCreateDatabase = () => {
      openCreateDatabaseModal(true, { conid: data.value?._id })
    }

    const getContextMenu = () => {
      const driver = extensions.value && extensions.value?.drivers.find(x => x.engine == data.value?.engine);
      const handleRefresh = () => {
        void serverConnectionsRefreshApi({conid: data.value?._id})
      }
      const handleDisconnect = () => {
        disconnectServerConnection(data.value);
      }

      const handleServerSummary = () => {
        void openNewTab({
          title: getConnectionLabel(data.value),
          icon: 'img server',
          tabComponent: 'ServerSummaryTab',
          props: {
            conid: data.value?._id,
          },
        });
      }

      const handleViewOrEdit = () => {
        const isOpened = !!(data.value && bootstrap.getOpenedConnections.includes(data.value?._id))
        if (isOpened) {
          handleServerSummary()
          return
        }
        const payload = toRaw(data.value as any)
        window.dispatchEvent(new CustomEvent('open-connection-modal', { detail: payload }))
      }

      return [
        [
          {
            label: data.value && bootstrap.getOpenedConnections.includes(data.value?._id) ? '查看详情' : '编辑',
            onClick: handleViewOrEdit,
          },
          {
            label: '删除',
            onClick: handleDelete,
          },
          {
            label: '复制',
            onClick: () => {
              message.warning('developing')
            }
          },
          (data.value && bootstrap.getOpenedConnections.includes(data.value?._id) && data.value?.status) && {
            text: '刷新',
            onClick: handleRefresh,
          },
          data.value && bootstrap.getOpenedConnections.includes(data.value?._id) && {
            text: '断开连接',
            onClick: handleDisconnect,
          },
          {
            text: '创建数据库',
            onClick: handleCreateDatabase,
          },
          {
            text: '服务器概览',
            onClick: handleServerSummary,
          }
        ],
        data.value?.singleDatabase && [
          {divider: true},
        ],
        (driver && driver?.databaseEngineTypes?.includes('sql')) && {
          onClick: handleSqlRestore,
          text: '恢复/导入 SQL 转储'
        }
      ]
    }

    return () => {
      const {...restProps} = attrs
      return (
        <>
          <AppObjectCore
            {...restProps}
            data={data.value as ConnectionsWithStatus}
            title={getConnectionLabel(data.value)}
            icon={data.value!.singleDatabase ? 'img database' : 'img server'}
            isBold={data.value!.singleDatabase
              ? get(currentDatabase.value, 'connection._id') == data.value!._id && get(currentDatabase.value, 'name') == data.value!.defaultDatabase
              : get(currentDatabase.value, 'connection._id') == data.value!._id}
            statusIcon={statusIconRef.value || engineStatusIconRef.value}
            statusTitle={statusTitleRef.value || engineStatusTitleRef.value}
            statusIconBefore={data.value && data.value.isReadOnly ? 'icon lock' : null}
            extInfo={extInfoRef.value}
            menu={getContextMenu}
            onClick={handleClick}
            onDblclick={handleConnect}
          />
          <CreateDatabaseModal onRegister={registerCreateDatabaseModal} />
        </>
      )
    }
  },
  extractKey: data => data._id,
  createMatcher: props => filter => {
    const {_id, displayName, server} = props;
    const databases = getLocalStorage(`database_list_${_id}`) || [];
    return filterName(unref(filter), displayName, server, ...databases.map(x => x.name))
  },
  createChildMatcher: props => filter => {
    if (!filter) return false;
    const {_id} = props;
    const databases = getLocalStorage(`database_list_${_id}`) || [];
    return filterName(unref(filter), ...databases.map(x => x.name));
  }
})


export function disconnectServerConnection(conid, showConfirmation = true) {
  const bootstrap = useBootstrapStore()

  const doDisconnect = async () => {
    const id = conid?._id
    if (!id) return

    try {
      // Close/refresh server-side connection pool
      await serverConnectionsRefreshApi({ conid: id, keepOpen: false })
    } catch (e) {
      // Some engines may not support explicit close; still update UI state
      console.warn('serverConnectionsRefreshApi(close) failed', e)
    }

    try {
      // If current DB is on this connection, attempt to close that database connection too
      const current = bootstrap.currentDatabase as any
      const dbName = current?.connection?._id === id ? current?.name : conid?.defaultDatabase
      if (dbName) {
        await databaseConnectionsRefreshApi({ conid: id, database: dbName, keepOpen: false })
      }
    } catch (e) {
      console.warn('databaseConnectionsRefreshApi(close) failed', e)
    }

    // Clear cached db list so next connect shows fresh databases
    removeLocalStorage(`database_list_${id}`)

    // Update UI state (collapse + not connected)
    bootstrap.updateExpandedConnections((list) => list.filter((x) => x !== id))
    bootstrap.updateOpenedConnections((list) => list.filter((x) => x !== id))
    bootstrap.updateOpenedSingleDatabaseConnections((list) => list.filter((x) => x !== id))

    if ((bootstrap.currentDatabase as any)?.connection?._id === id) {
      bootstrap.setCurrentDatabase(null)
    }
  }

  if (!conid?._id) return

  if (!showConfirmation) {
    void doDisconnect()
    return
  }

  const r = Modal.confirm({
    title: 'Confirm',
    icon: createVNode(ExclamationCircleOutlined),
    content: `Disconnect ${getConnectionLabel(conid)}?`,
    okText: 'Ok',
    cancelText: 'Cancel',
    onOk: async () => {
      try {
        await doDisconnect()
        r.destroy()
      } catch (e: any) {
        // avoid throwing inside Modal handler
        console.error(e)
      }
    },
    onCancel: () => r.destroy(),
  })
}

export function openConnection(connection, bootstrap) {
  // 使用立即执行的异步函数来处理错误，不阻塞 UI
  ;(async () => {
    try {
      if (connection!.singleDatabase) {
        bootstrap.setCurrentDatabase({
          connection: connection!,
          name: connection!.defaultDatabase
        } as unknown as IPinnedDatabasesItem)
        const result = await databaseConnectionsRefreshApi({
          conid: connection._id!,
          database: connection.defaultDatabase!,
          keepOpen: true
        })
        // 检查是否有错误信息
        if (result && (result as any).errorMessage) {
          const { useMessage } = await import('/@/hooks/web/useMessage')
          const { notification } = useMessage()
          notification.error({
            message: '连接失败',
            description: (result as any).errorMessage,
            duration: 5,
          })
          return
        }
        bootstrap.updateOpenedSingleDatabaseConnections(x => uniq([...x, connection._id]))
      } else {
        bootstrap.updateOpenedConnections(x => uniq([...x, connection!._id]))
        const result = await serverConnectionsRefreshApi({
          conid: connection!._id,
          keepOpen: true,
        })
        // 检查是否有错误信息
        if (result && (result as any).errorMessage) {
          const { useMessage } = await import('/@/hooks/web/useMessage')
          const { notification } = useMessage()
          notification.error({
            message: '连接失败',
            description: (result as any).errorMessage,
            duration: 5,
          })
          return
        }
        bootstrap.updateExpandedConnections(x => uniq([...x, connection._id]))
      }
    } catch (e: any) {
      // 动态导入 useMessage 以避免循环依赖
      import('/@/hooks/web/useMessage').then(({ useMessage }) => {
        const { notification } = useMessage()
        const errMsg = e?.message || e?.toString() || '连接失败，请检查连接参数'
        notification.error({
          message: '连接失败',
          description: errMsg,
          duration: 5,
        })
      }).catch(console.error)
      console.error('Connection error:', e)
    }
  })()
}
