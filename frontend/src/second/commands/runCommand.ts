import openNewTab from '/@/second/utility/openNewTab'

export default function runCommand(id: string) {
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

    default:
      console.log(`Command ${id} not implemented`)
  }
}
