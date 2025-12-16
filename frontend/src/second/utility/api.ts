const apiLogging = false

// 等待 window.go 可用
async function waitForGo(maxWait = 5000): Promise<void> {
  const startTime = Date.now()
  while (!window['go']) {
    if (Date.now() - startTime > maxWait) {
      throw new Error('window.go is not available after waiting 5 seconds. Make sure Wails is properly initialized.')
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
