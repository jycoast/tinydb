const apiLogging = false

function isLikelyWailsEnv() {
  try {
    // In dev, Wails uses http(s) with hostname `wails.localhost`
    // In production, hostname may vary, but window.go should exist quickly.
    return window.location?.hostname === 'wails.localhost' || !!(window as any).runtime
  } catch {
    return false
  }
}

// 等待 window.go 可用
async function waitForGo(maxWaitMs?: number): Promise<void> {
  const likelyWails = isLikelyWailsEnv()
  // Wails cold start can be slow on Windows; allow longer wait in real Wails.
  const maxWait = maxWaitMs ?? (likelyWails ? 15000 : 1500)

  const startTime = Date.now()
  while (!window['go']) {
    if (Date.now() - startTime > maxWait) {
      // Provide a clearer hint for the most common case: running `vite` without Wails.
      if (!likelyWails) {
        throw new Error('当前运行环境未注入 Wails（window.go 不存在）。请使用项目根目录执行 `wails dev` 启动后端再测试连接。')
      }
      throw new Error('Wails 后端尚未初始化完成（window.go 未就绪），请稍后重试。如果你是用 `npm run dev` 启动的前端，也会出现该问题，请改用 `wails dev`。')
    }
    await new Promise(resolve => setTimeout(resolve, 100))
  }
}

export async function apiCall<T>(url: string, params?: any): Promise<T | void> {
  //读取环境变量
  if (apiLogging) {
    console.log('>>> API CALL', url, params)
  }

  try {
    // 等待 window.go 可用
    await waitForGo()
    
    let self: any = window['go'];
    if (!self) {
      throw new Error('window.go is not defined')
    }
    
    url.split(/[.\/]/).filter(item => item).forEach(key => {
      if (self && typeof self === 'object' && key in self) {
        self = self[key]
      } else {
        throw new Error(`Cannot access ${key} in window.go.${url.split('.').slice(0, url.split('.').indexOf(key) + 1).join('.')}`)
      }
    })
    
    if (typeof self !== 'function') {
      throw new Error(`window.go.${url} is not a function`)
    }
    
    if (!params || Object.keys(params).length === 0) {
      const resp = await self()
      return processApiResponse(url, params, resp)
    }
    const resp = await self(params)
    return processApiResponse(url, params, resp)
  } catch (e) {
    return Promise.reject(e)
  }
}

function processApiResponse(url, params, resp) {
  if (apiLogging) {
    console.log('<<< API RESPONSE', url, params, resp)
  }

  if (resp.status === 1) {
    return {
      ...resp,
      errorMessage: resp.message
    }
    // return resp.result.message
    // throw resp.message
  }
  return resp.result
}
