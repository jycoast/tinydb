import registerCommand from './registerCommand'
import runCommand from './runCommand'

registerCommand({
  id: 'new.connection',
  toolbar: true,
  icon: 'icon new-connection',
  toolbarName: '新建连接',
  category: 'New',
  toolbarOrder: 1,
  name: 'Connection',
  onClick: () => runCommand('new.connection')
})
