/**
 * 查询历史管理工具
 * 用于存储和管理 SQL 查询历史记录
 */

export interface QueryHistoryItem {
  id: string
  sql: string
  timestamp: number
  conid?: string
  database?: string
}

const HISTORY_STORAGE_KEY = 'tinydb_query_history'
const MAX_HISTORY_COUNT = 1000 // 最多保存 1000 条历史记录

/**
 * 获取所有查询历史
 */
export function getQueryHistory(): QueryHistoryItem[] {
  try {
    const stored = localStorage.getItem(HISTORY_STORAGE_KEY)
    if (!stored) return []
    const history = JSON.parse(stored) as QueryHistoryItem[]
    return Array.isArray(history) ? history : []
  } catch (e) {
    console.error('Failed to load query history:', e)
    return []
  }
}

/**
 * 保存查询历史
 */
export function saveQueryHistory(sql: string, conid?: string, database?: string): void {
  if (!sql || !sql.trim()) return

  try {
    const history = getQueryHistory()
    const newItem: QueryHistoryItem = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      sql: sql.trim(),
      timestamp: Date.now(),
      conid,
      database,
    }

    // 避免重复保存相同的 SQL（如果最近 10 秒内执行过相同的 SQL，则不保存）
    const recentDuplicate = history.find(
      item =>
        item.sql === newItem.sql &&
        item.conid === newItem.conid &&
        item.database === newItem.database &&
        Date.now() - item.timestamp < 10000
    )

    if (recentDuplicate) {
      return
    }

    // 添加到开头
    history.unshift(newItem)

    // 限制历史记录数量
    if (history.length > MAX_HISTORY_COUNT) {
      history.splice(MAX_HISTORY_COUNT)
    }

    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history))
  } catch (e) {
    console.error('Failed to save query history:', e)
    // 如果存储失败，尝试清理一些旧记录
    try {
      const history = getQueryHistory()
      if (history.length > 100) {
        const trimmed = history.slice(0, 100)
        localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(trimmed))
      }
    } catch (e2) {
      console.error('Failed to trim query history:', e2)
    }
  }
}

/**
 * 删除指定的查询历史项
 */
export function deleteQueryHistoryItem(id: string): void {
  try {
    const history = getQueryHistory()
    const filtered = history.filter(item => item.id !== id)
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(filtered))
  } catch (e) {
    console.error('Failed to delete query history item:', e)
  }
}

/**
 * 清空所有查询历史
 */
export function clearQueryHistory(): void {
  try {
    localStorage.removeItem(HISTORY_STORAGE_KEY)
  } catch (e) {
    console.error('Failed to clear query history:', e)
  }
}

/**
 * 根据条件搜索查询历史
 */
export function searchQueryHistory(keyword: string, conid?: string, database?: string): QueryHistoryItem[] {
  const history = getQueryHistory()
  let filtered = history

  if (keyword) {
    const lowerKeyword = keyword.toLowerCase()
    filtered = filtered.filter(item => item.sql.toLowerCase().includes(lowerKeyword))
  }

  if (conid) {
    filtered = filtered.filter(item => item.conid === conid)
  }

  if (database) {
    filtered = filtered.filter(item => item.database === database)
  }

  return filtered
}
