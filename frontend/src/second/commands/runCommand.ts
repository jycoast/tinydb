import { useBootstrapStore } from '/@/store/modules/bootstrap'
import { storeToRefs } from 'pinia'
import openNewTab from '/@/second/utility/openNewTab'

export default function runCommand(id: string) {
  const bootstrap = useBootstrapStore()
  const { currentDatabase } = storeToRefs(bootstrap)

  switch (id) {
    case 'new.query':
      // 打开新的 SQL 查询标签页
      const conid = currentDatabase.value?.connection?._id
      const database = currentDatabase.value?.name

      openNewTab({
        title: '新建查询#',
        icon: 'icon query',
        tabComponent: 'SqlQueryTab',
        props: {
          conid: conid || undefined,
          database: database || undefined
        },
        selected: true,
        busy: false
      })
      break

    case 'new.connection':
      // TODO: 打开连接对话框
      console.log('Open connection dialog')
      break

    default:
      console.log(`Command ${id} not implemented`)
  }
}
