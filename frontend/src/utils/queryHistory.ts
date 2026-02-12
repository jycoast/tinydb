export interface QueryHistoryItem {
  id: string
  sql: string
  timestamp: number
  conid?: string
  database?: string
}

const HISTORY_STORAGE_KEY = "tinydb_query_history"
const MAX_HISTORY_COUNT = 1000

export function getQueryHistory(): QueryHistoryItem[] {
  try {
    const stored = localStorage.getItem(HISTORY_STORAGE_KEY)
    if (!stored) return []
    const history = JSON.parse(stored) as QueryHistoryItem[]
    return Array.isArray(history) ? history : []
  } catch {
    return []
  }
}

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

    // 10秒内重复SQL不重复保存
    const recentDuplicate = history.find(
      item =>
        item.sql === newItem.sql &&
        item.conid === newItem.conid &&
        item.database === newItem.database &&
        Date.now() - item.timestamp < 10000
    )
    if (recentDuplicate) return

    history.unshift(newItem)
    if (history.length > MAX_HISTORY_COUNT) {
      history.splice(MAX_HISTORY_COUNT)
    }

    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history))
  } catch {
    try {
      const history = getQueryHistory()
      if (history.length > 100) {
        localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history.slice(0, 100)))
      }
    } catch {}
  }
}

export function deleteQueryHistoryItem(id: string): void {
  try {
    const history = getQueryHistory()
    const filtered = history.filter(item => item.id !== id)
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(filtered))
  } catch {}
}

export function clearQueryHistory(): void {
  try {
    localStorage.removeItem(HISTORY_STORAGE_KEY)
  } catch {}
}
