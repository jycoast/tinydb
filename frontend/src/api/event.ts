import {storeToRefs} from 'pinia'
import {EventsOn, EventsEmit}from '/@/wailsjs/runtime/runtime'
import {useBootstrapStore} from '/@/store/modules/bootstrap'
import {findEngineDriver} from '/@/second/tinydb-tools'
import {useClusterApiStore} from '/@/store/modules/clusterApi'
import {dumpSqlSelect} from '/@/second/tinydb-sqltree'
import {Select} from '/@/second/tinydb-sqltree/types'
import Mongo from '/@/second/plugins/tinydb-plugin-mongo'
import Mysql from '/@/second/plugins/tinydb-plugin-mysql'

let runtimeEventsInitialized = false

export default function dispatchRuntimeEvent() {
  if (runtimeEventsInitialized) return
  runtimeEventsInitialized = true

  const bootstrap = useBootstrapStore()
  const {extensions} = storeToRefs(bootstrap)
  const clusterApi = useClusterApiStore()
  const {connection} = storeToRefs(clusterApi)

  //获取数据库基本配置信息
  EventsOn('pullEventPluginsScript', (adapter: 'mongo' | 'mysql') => {
    switch (adapter) {
      case 'mysql':
        EventsEmit('loadPlugins', Mysql)
        break
      case 'mongo':
        EventsEmit('loadPlugins', Mongo)
        break
      default:
        EventsEmit('loadPlugins')
    }
  })

  // 构建查询 SQL（后端会等待 handleSqlSelectReturn；这里必须保证一定会 emit 一个 string）
  EventsOn('handleSqlSelect', (selectParams: any) => {
    try {
      // 如果前端已经传了原始 SQL，直接回传
      if (typeof selectParams === 'string') {
        EventsEmit('handleSqlSelectReturn', selectParams)
        return
      }
      if (selectParams && typeof selectParams === 'object' && typeof selectParams.sql === 'string') {
        EventsEmit('handleSqlSelectReturn', selectParams.sql)
        return
      }

      const driver = extensions.value ? findEngineDriver(connection.value, extensions.value) : null
      if (driver) {
        const dmp = driver.createDumper()
        dumpSqlSelect(dmp, selectParams as Select)
        EventsEmit('handleSqlSelectReturn', dmp?.s || '')
        return
      }

      // fallback: avoid backend hang
      EventsEmit('handleSqlSelectReturn', '')
    } catch (e) {
      console.warn('handleSqlSelect failed, returning empty sql to avoid hang', e)
      EventsEmit('handleSqlSelectReturn', '')
    }
  })
}


