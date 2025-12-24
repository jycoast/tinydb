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
let warnedInvalidSqlOnce = false

export default function dispatchRuntimeEvent() {
  if (runtimeEventsInitialized) return
  runtimeEventsInitialized = true

  const bootstrap = useBootstrapStore()
  const {extensions, currentDatabase} = storeToRefs(bootstrap)
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
    console.log(`[handleSqlSelect] Event received:`, {
      type: typeof selectParams,
      isString: typeof selectParams === 'string',
      hasSql: selectParams && typeof selectParams === 'object' && typeof selectParams.sql === 'string',
      from: (selectParams as any)?.from
    })
    try {
      // 如果前端已经传了原始 SQL，直接回传
      if (typeof selectParams === 'string') {
        console.log(`[handleSqlSelect] Returning string SQL directly`)
        EventsEmit('handleSqlSelectReturn', selectParams)
        return
      }
      if (selectParams && typeof selectParams === 'object' && typeof selectParams.sql === 'string') {
        console.log(`[handleSqlSelect] Returning SQL from sql property`)
        EventsEmit('handleSqlSelectReturn', selectParams.sql)
        return
      }

      // 尝试从多个来源获取 connection
      // 1. 全局 connection (clusterApi)
      // 2. currentDatabase 中的 connection (bootstrap)
      const currentConnection = connection.value || currentDatabase.value?.connection
      const driver = extensions.value && currentConnection ? findEngineDriver(currentConnection, extensions.value) : null
      console.log(`[handleSqlSelect] Driver check:`, {
        hasExtensions: !!extensions.value,
        hasGlobalConnection: !!connection.value,
        hasCurrentDatabase: !!currentDatabase.value,
        hasCurrentDatabaseConnection: !!currentDatabase.value?.connection,
        hasConnection: !!currentConnection,
        hasDriver: !!driver
      })
      if (driver) {
        // 调试：检查 selectParams 中的表名信息
        const fromName = (selectParams as any)?.from?.name
        if (fromName) {
          console.log(`[handleSqlSelect] From name info:`, {
            pureName: fromName.pureName,
            schemaName: fromName.schemaName,
            hasPureName: !!fromName.pureName,
            hasSchemaName: !!fromName.schemaName,
            pureNameType: typeof fromName.pureName,
            schemaNameType: typeof fromName.schemaName
          })
        } else {
          console.error(`[handleSqlSelect] Missing from.name in selectParams:`, selectParams)
        }
        
        const dmp = driver.createDumper()
        dumpSqlSelect(dmp, selectParams as Select)
        const out = dmp?.s || ''
        
        // 调试：检查生成的 SQL
        console.log(`[handleSqlSelect] Generated SQL:`, out)

        // Guard: if generated SQL contains an empty quoted identifier token `` (likely missing table/column name),
        // fallback to a minimal safe SELECT to keep table browsing usable.
        const hasEmptyIdentToken = (s: string) => {
          const isDelim = (ch: string) => {
            return (
              ch === '' ||
              ch === ' ' ||
              ch === '\t' ||
              ch === '\n' ||
              ch === '\r' ||
              ch === '.' ||
              ch === ',' ||
              ch === ';' ||
              ch === ')' ||
              ch === ']' ||
              ch === '}'
            )
          }
          for (let i = 0; i + 1 < s.length; i++) {
            // empty identifier: `` followed by delimiter/end
            if (s[i] === '`' && s[i + 1] === '`') {
              const next = (i + 2 < s.length) ? s[i + 2] : ''
              if (isDelim(next)) return true
            }
            // blank identifier: ` ` (or whitespace) then `
            if (s[i] === '`' && i + 2 < s.length && /\s/.test(s[i + 1]) && s[i + 2] === '`') {
              return true
            }
          }
          return false
        }

        if (out && hasEmptyIdentToken(out)) {
          try {
            const name = (selectParams as any)?.from?.name || {}
            const pureName = typeof name?.pureName === 'string' ? name.pureName.trim() : ''
            const schemaName = typeof name?.schemaName === 'string' ? name.schemaName.trim() : ''
            const limit = Number((selectParams as any)?.range?.limit) || 200
            const quote = (s: string) => `\`${String(s).replace(/`/g, '``')}\``
            if (pureName) {
              const from = schemaName ? `${quote(schemaName)}.${quote(pureName)}` : `${quote(pureName)}`
              const fallbackSql = `SELECT * FROM ${from} LIMIT ${limit};`
              if (!warnedInvalidSqlOnce) {
                warnedInvalidSqlOnce = true
                // eslint-disable-next-line no-console
                console.warn('[tinydb] Generated invalid SQL (empty identifier), using fallback SELECT', { out, fallbackSql, selectParams })
              }
              EventsEmit('handleSqlSelectReturn', fallbackSql)
              return
            }
          } catch {
            // ignore fallback build errors
          }
        }

        EventsEmit('handleSqlSelectReturn', out)
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


