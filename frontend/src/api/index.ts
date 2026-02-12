import {isReactive, isRef, ref, Ref} from "vue"
import {isArray} from "lodash-es"
import {isFunction} from "/@/utils/is"
import stableStringify from "json-stable-stringify"
import {extendDatabaseInfo} from "/@/lib/tinydb-tools"
import {EventsOn} from "/@/wailsjs/runtime/runtime"
import {apiCall} from "/@/utils/tinydb/api"
import {loadCachedValue} from "/@/utils/tinydb/cache"

const connectionListLoader = () => ({
  url: "bridge.Connections.List",
  params: {},
  reloadTrigger: "connection-list-changed",
})

const serverStatusLoader = () => ({
  url: "bridge.ServerConnections.ServerStatus",
  params: {},
  reloadTrigger: "server-status-changed",
})

const databaseListLoader = ({conid}) => ({
  url: "bridge.ServerConnections.ListDatabases",
  params: {conid},
  reloadTrigger: `database-list-changed-${conid}`,
})

const databaseServerVersionLoader = ({conid, database}) => ({
  url: "bridge.DatabaseConnections.ServerVersion",
  params: {conid, database},
  reloadTrigger: `database-server-version-changed-${conid}-${database}`,
})

const databaseStatusLoader = ({conid, database}) => ({
  url: "bridge.DatabaseConnections.Status",
  params: {conid, database},
  reloadTrigger: `database-status-changed-${conid}-${database}`,
})

const databaseInfoLoader = ({conid, database}) => ({
  url: "bridge.DatabaseConnections.Structure",
  params: {conid, database},
  reloadTrigger: `database-structure-changed-${conid}-${database}`,
  transform: extendDatabaseInfo,
})

const connectionInfoLoader = ({conid}) => ({
  url: "bridge.Connections.Get",
  params: {conid},
  reloadTrigger: "connection-list-changed",
})

const installedPluginsLoader = () => ({
  url: "bridge.Plugins.Installed",
  params: {},
  reloadTrigger: "installed-plugins-changed",
})

const settingsLoader = () => ({
  url: "config/get-settings",
  params: {},
  reloadTrigger: "settings-changed",
})

async function getCore(loader, args) {
  const {url, params, reloadTrigger, transform, onLoaded, errorValue} = loader(args)
  const key = stableStringify({url, ...params})

  async function doLoad() {
    const resp = await apiCall(url, params) as any
    if (resp?.errorMessage && errorValue !== undefined) {
      if (onLoaded) onLoaded(errorValue)
      return errorValue
    }
    const res = (transform || (x => x))(resp)
    if (onLoaded) onLoaded(res)
    return res
  }

  return await loadCachedValue(reloadTrigger, key, doLoad)
}

function useCore<T>(loader, args, dbStore: Ref<T | null | undefined> | Function) {
  const openedCount = ref(0)
  const {reloadTrigger} = loader(args)

  async function handleReload() {
    const res = await getCore(loader, args)
    if (openedCount.value > 0) {
      if (isRef(dbStore)) {
        dbStore.value = res
      } else if (isReactive(dbStore)) {
        dbStore = res
      } else if (isFunction(dbStore)) {
        dbStore(res)
      }
    }
  }

  if (!!reloadTrigger) {
    try {
      EventsOn(reloadTrigger, () => void handleReload())
    } catch (e) {
      console.error(`listener event ${reloadTrigger} failed`, e)
    }
  }

  openedCount.value += 1
  void handleReload()
}

export function useConnectionList<T>(dbStore: Ref<T> | Function) {
  return useCore(connectionListLoader, {}, dbStore)
}

export function useServerStatus<T>(dbStore: Ref<T>) {
  return useCore(serverStatusLoader, {}, dbStore)
}

export function useDatabaseList<T>(args, dbStore: Ref<T>) {
  return useCore(databaseListLoader, args, dbStore)
}

export function useDatabaseServerVersion<T>(args, dbStore: Ref<T>) {
  return useCore(databaseServerVersionLoader, args, dbStore)
}

export function useDatabaseStatus<T>(args, dbStore: Ref<T>) {
  return useCore(databaseStatusLoader, args, dbStore)
}

export function useDatabaseInfo<T>(args, dbStore: Ref<T> | Function) {
  return useCore(databaseInfoLoader, args, dbStore)
}

export function getConnectionInfo(args) {
  return getCore(connectionInfoLoader, args)
}

export function useConnectionInfo<T>(args, dbStore: Ref<T> | Function) {
  return useCore(connectionInfoLoader, args, dbStore)
}

export function useInstalledPlugins<T>(args = {}, dbStore: Ref<T>) {
  return useCore(installedPluginsLoader, args, dbStore)
}

export function useSettings<T>(dbStore: Ref<T>) {
  return useCore(settingsLoader, {}, dbStore)
}

export function useCollectionInfo<T>(args, dbStore: Ref<T>) {
  return useDbCore(args, dbStore, "collections")
}

export function useDbCore<T>(args, dbStore: Ref<T | null>, objectTypeField?: string | string[]) {
  useDatabaseInfo(args, dbStore)
  const db = dbStore.value
  if (!db) return
  const field = objectTypeField || args.objectTypeField
  if (isArray(field) && db) {
    for (const f of field) {
      const res = db[f].find((x) => x.pureName == args.pureName && x.schemaName == args.schemaName)
      if (res) {
        dbStore.value = res
        return
      }
    }
  } else {
    dbStore.value = db[field].find((x) => x.pureName == args.pureName && x.schemaName == args.schemaName)
  }
}

export async function connectionTestApi(params) {
  return await apiCall("bridge.Connections.Test", params)
}

export async function connectionSaveApi(params) {
  return await apiCall("bridge.Connections.Save", params)
}

export async function connectionListApi() {
  return await apiCall("bridge.Connections.List")
}

export async function connectionDeleteApi(params) {
  return await apiCall("bridge.Connections.Delete", params)
}

export async function databaseConnectionsRefreshApi(params: {
  conid: string
  database: string
  keepOpen?: boolean
}) {
  return await apiCall("bridge.DatabaseConnections.Refresh", params)
}

export async function databaseConnectionsSqlSelectApi<T>(params: {
  conid: string
  database: string
  select: unknown
}): Promise<T> {
  return (await apiCall("bridge.DatabaseConnections.SqlSelect", params)) as T
}

export async function databaseConnectionsCollectionDataApi<T>(params: {
  conid: string
  database: string
  options: unknown
}): Promise<T> {
  return (await apiCall("bridge.DatabaseConnections.CollectionData", params)) as T
}

export async function databaseConnectionsCreateTableApi(params: {
  conid: string
  database: string
  tableName: string
  columns: any[]
}) {
  return await apiCall("bridge.DatabaseConnections.CreateTable", params)
}

export async function serverConnectionsRefreshApi(params) {
  return await apiCall("bridge.ServerConnections.Refresh", params)
}

export async function serverConnectionsCreateDatabaseApi(params: {conid: string; name: string}) {
  return await apiCall("bridge.ServerConnections.CreateDatabase", params)
}

export {subscribeConnectionPingers} from "/@/hooks/tinydb/useConnectionPingers"
export {subscribeRecentDatabaseSwitch} from "/@/hooks/tinydb/useRecentDatabaseSwitch"
export {subscribeCurrentDbByTab} from "/@/hooks/tinydb/useCurrentDbByTab"
