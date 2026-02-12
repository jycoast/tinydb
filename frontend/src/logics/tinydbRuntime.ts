import {storeToRefs} from "pinia"
import {EventsOn, EventsEmit} from "/@/wailsjs/runtime/runtime"
import {useBootstrapStore} from "/@/store/modules/bootstrap"
import {findEngineDriver} from "/@/lib/tinydb-tools"
import {useClusterApiStore} from "/@/store/modules/clusterApi"
import {dumpSqlSelect, Select} from "/@/lib/tinydb-sqltree"
import Mongo from "/@/plugins/tinydb-plugin-mongo"
import Mysql from "/@/plugins/tinydb-plugin-mysql"

let runtimeEventsInitialized = false
let warnedInvalidSqlOnce = false

const hasEmptyIdentToken = (s: string) => {
  const isDelim = (ch: string) =>
    ["", " ", "\t", "\n", "\r", ".", ",", ";", ")", "]", "}"].includes(ch)
  for (let i = 0; i + 1 < s.length; i++) {
    if (s[i] === "`" && s[i + 1] === "`") {
      const next = i + 2 < s.length ? s[i + 2] : ""
      if (isDelim(next)) return true
    }
    if (s[i] === "`" && i + 2 < s.length && /\s/.test(s[i + 1]) && s[i + 2] === "`") {
      return true
    }
  }
  return false
}

export default function dispatchRuntimeEvent() {
  if (runtimeEventsInitialized) return
  runtimeEventsInitialized = true

  const bootstrap = useBootstrapStore()
  const {extensions, currentDatabase} = storeToRefs(bootstrap)
  const clusterApi = useClusterApiStore()
  const {connection} = storeToRefs(clusterApi)

  EventsOn("pullEventPluginsScript", (adapter: "mongo" | "mysql") => {
    switch (adapter) {
      case "mysql":
        EventsEmit("loadPlugins", Mysql)
        break
      case "mongo":
        EventsEmit("loadPlugins", Mongo)
        break
      default:
        EventsEmit("loadPlugins")
    }
  })

  EventsOn("handleSqlSelect", (selectParams: any) => {
    try {
      if (typeof selectParams === "string") {
        EventsEmit("handleSqlSelectReturn", selectParams)
        return
      }
      if (selectParams?.sql && typeof selectParams.sql === "string") {
        EventsEmit("handleSqlSelectReturn", selectParams.sql)
        return
      }

      const currentConnection = connection.value || currentDatabase.value?.connection
      const driver =
        extensions.value && currentConnection
          ? findEngineDriver(currentConnection, extensions.value)
          : null
      if (driver) {
        const dmp = driver.createDumper()
        dumpSqlSelect(dmp, selectParams as Select)
        const out = dmp?.s || ""

        if (out && hasEmptyIdentToken(out)) {
          const name = selectParams?.from?.name || {}
          const pureName = typeof name?.pureName === "string" ? name.pureName.trim() : ""
          const schemaName = typeof name?.schemaName === "string" ? name.schemaName.trim() : ""
          const limit = Number(selectParams?.range?.limit) || 200
          const quote = (s: string) => `\`${String(s).replace(/`/g, "``")}\``
          if (pureName) {
            const from = schemaName ? `${quote(schemaName)}.${quote(pureName)}` : quote(pureName)
            const fallbackSql = `SELECT * FROM ${from} LIMIT ${limit};`
            if (!warnedInvalidSqlOnce) {
              warnedInvalidSqlOnce = true
              console.warn("[tinydb] Generated invalid SQL, using fallback", {out, fallbackSql})
            }
            EventsEmit("handleSqlSelectReturn", fallbackSql)
            return
          }
        }

        EventsEmit("handleSqlSelectReturn", out)
        return
      }

      EventsEmit("handleSqlSelectReturn", "")
    } catch (e) {
      console.warn("handleSqlSelect failed", e)
      EventsEmit("handleSqlSelectReturn", "")
    }
  })
}
