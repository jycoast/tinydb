const apiLogging = false

import * as Bridge from "../../../bindings/tinydb/app/bridge/index.js"

function isLikelyWailsEnv() {
  try {
    return window.location?.hostname === "wails.localhost" || !!(window as any).runtime
  } catch {
    return false
  }
}

async function waitForBindings(_maxWaitMs?: number): Promise<void> {
  if (typeof Bridge.ConnectionsService?.List !== "function") {
    throw new Error("当前运行环境未注入 Wails（bindings 不存在）。请使用 `wails3 dev` 启动。")
  }
}

const urlToBinding: Record<string, (params?: any) => Promise<unknown>> = {
  "Connections.Test": (p) => Bridge.ConnectionsService.Test(p),
  "Connections.Save": (p) => Bridge.ConnectionsService.Save(p),
  "Connections.List": () => Bridge.ConnectionsService.List(),
  "Connections.Get": (p) => Bridge.ConnectionsService.Get(p),
  "Connections.Delete": (p) => Bridge.ConnectionsService.Delete(p),
  "DatabaseConnections.Refresh": (p) => Bridge.DatabaseConnections.Refresh(p),
  "DatabaseConnections.Structure": (p) => Bridge.DatabaseConnections.Structure(p),
  "DatabaseConnections.SqlSelect": (p) => Bridge.DatabaseConnections.SqlSelect(p),
  "DatabaseConnections.CollectionData": (p) => Bridge.DatabaseConnections.CollectionData(p),
  "DatabaseConnections.CreateTable": (p) => Bridge.DatabaseConnections.CreateTable(p),
  "DatabaseConnections.Status": (p) => Bridge.DatabaseConnections.Status(p),
  "DatabaseConnections.ServerVersion": (p) => Bridge.DatabaseConnections.ServerVersion(p),
  "DatabaseConnections.Disconnect": (p) => Bridge.DatabaseConnections.Disconnect(p),
  "ServerConnections.Refresh": (p) => Bridge.ServerConnections.Refresh(p),
  "ServerConnections.ListDatabases": (p) => Bridge.ServerConnections.ListDatabases(p ?? {}),
  "ServerConnections.ServerStatus": () => Bridge.ServerConnections.ServerStatus(),
  "ServerConnections.CreateDatabase": (p) => Bridge.ServerConnections.CreateDatabase(p),
  "Plugins.Installed": () => Bridge.PluginsService.Installed(),
  "Plugins.Script": (p) => Bridge.PluginsService.Script(p),
  "Configs.GetSettings": () => Bridge.Configs.GetSettings(),
}

export async function apiCall<T>(url: string, params?: any): Promise<T | void> {
  if (apiLogging) {
    console.log(">>> API CALL", url, params)
  }
  try {
    await waitForBindings()
    let key = url
    if (key.startsWith("bridge.")) {
      key = key.slice("bridge.".length)
    }
    if (key === "config/get-settings" || key === "config.get-settings") {
      key = "Configs.GetSettings"
    }
    const fn = urlToBinding[key]
    if (!fn) {
      throw new Error(`Unknown API: ${url}`)
    }
    const resp = await fn(params)
    return processApiResponse(url, params, resp)
  } catch (e) {
    return Promise.reject(e)
  }
}

function processApiResponse(_url: string, _params: any, resp: any) {
  if (apiLogging) {
    console.log("<<< API RESPONSE", _url, _params, resp)
  }
  if (resp?.status === 1) {
    return { ...resp, errorMessage: resp.message }
  }
  return resp?.result
}
