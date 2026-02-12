const apiLogging = false

function isLikelyWailsEnv() {
  try {
    return window.location?.hostname === "wails.localhost" || !!(window as any).runtime
  } catch {
    return false
  }
}

async function waitForGo(maxWaitMs?: number): Promise<void> {
  const likelyWails = isLikelyWailsEnv()
  const maxWait = maxWaitMs ?? (likelyWails ? 15000 : 1500)

  const startTime = Date.now()
  while (!window["go"]) {
    if (Date.now() - startTime > maxWait) {
      if (!likelyWails) {
        throw new Error("当前运行环境未注入 Wails（window.go 不存在）。请使用 `wails dev` 启动。")
      }
      throw new Error("Wails 后端尚未初始化完成（window.go 未就绪），请稍后重试。")
    }
    await new Promise(resolve => setTimeout(resolve, 100))
  }
}

export async function apiCall<T>(url: string, params?: any): Promise<T | void> {
  if (apiLogging) {
    console.log(">>> API CALL", url, params)
  }

  try {
    await waitForGo()

    let self: any = window["go"]
    if (!self) {
      throw new Error("window.go is not defined")
    }

    url.split(/[.\/]/).filter(item => item).forEach(key => {
      if (self && typeof self === "object" && key in self) {
        self = self[key]
      } else {
        throw new Error(`Cannot access ${key} in window.go path`)
      }
    })

    if (typeof self !== "function") {
      throw new Error(`window.go.${url} is not a function`)
    }

    const resp = (!params || Object.keys(params).length === 0) ? await self() : await self(params)
    return processApiResponse(url, params, resp)
  } catch (e) {
    return Promise.reject(e)
  }
}

function processApiResponse(url: string, params: any, resp: any) {
  if (apiLogging) {
    console.log("<<< API RESPONSE", url, params, resp)
  }

  if (resp.status === 1) {
    return {
      ...resp,
      errorMessage: resp.message,
    }
  }
  return resp.result
}
