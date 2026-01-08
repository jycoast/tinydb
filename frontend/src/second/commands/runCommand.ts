import openNewTab from '/@/second/utility/openNewTab'
import { useBootstrapStore } from '/@/store/modules/bootstrap'
import { storeToRefs } from 'pinia'

export default function runCommand(id: string) {
  const bootstrap = useBootstrapStore()
  const { currentDatabase } = storeToRefs(bootstrap)

  switch (id) {
    case 'new.query':
      // 打开新的 SQL 查询标签页
      openNewTab({
        title: '新建查询#',
        icon: 'icon query',
        tabComponent: 'SqlQueryTab',
        props: {
          // Do NOT prefill db/connection for "New Query" (Navicat-like)
          noPrefill: true,
        },
        selected: true,
        busy: false
      }, undefined, { forceNewTab: true })
      break

    case 'new.connection':
      // TODO: 打开连接对话框
      console.log('Open connection dialog')
      break

    case 'new.table':
      // 打开创建表的 Modal
      if (currentDatabase.value?.connection?._id && currentDatabase.value?.name) {
        // 触发一个自定义事件，让组件监听并打开 Modal
        window.dispatchEvent(new CustomEvent('open-create-table-modal', {
          detail: {
            conid: currentDatabase.value.connection._id,
            database: currentDatabase.value.name
          }
        }))
      } else {
        alert('请先选择数据库')
      }
      break

    case 'query.history':
      // 打开查询历史标签页
      openNewTab({
        title: '查询历史',
        icon: 'icon query',
        tabComponent: 'QueryHistoryTab',
        props: {},
        selected: true,
        busy: false
      })
      break

    default:
      console.log(`Command ${id} not implemented`)
  }
}
