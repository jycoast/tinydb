<template>
  <div class="query-history-page">
    <div class="page-header">
      <h2>查询历史</h2>
      <el-space>
        <el-button :icon="Refresh" :loading="loading" @click="loadHistory" size="small">刷新</el-button>
        <el-button :icon="Delete" @click="handleClearAll" size="small" type="danger">清空历史</el-button>
      </el-space>
    </div>

    <div class="page-content" ref="pageContentRef">
      <el-input
        v-model="searchText"
        clearable
        placeholder="搜索查询历史..."
        size="small"
        class="search-input"
      >
        <template #prefix>
          <el-icon><Search /></el-icon>
        </template>
      </el-input>

      <el-empty v-if="filteredHistory.length === 0" description="暂无查询历史" />

      <el-table
        v-else
        :data="filteredHistory"
        stripe
        border
        :height="tableHeight"
        style="width: 100%"
        :row-class-name="tableRowClassName"
        @row-click="handleRowClick"
      >
        <el-table-column type="index" label="#" width="60" />
        <el-table-column prop="timestamp" label="时间" width="180">
          <template #default="{ row }">
            {{ formatTime(row.timestamp) }}
          </template>
        </el-table-column>
        <el-table-column prop="sql" label="SQL 语句" min-width="300" show-overflow-tooltip>
          <template #default="{ row }">
            <code class="sql-preview">{{ row.sql }}</code>
          </template>
        </el-table-column>
        <el-table-column prop="database" label="数据库" width="120" show-overflow-tooltip />
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-space>
              <el-button
                size="small"
                text
                type="primary"
                @click.stop="handleCopySql(row)"
              >
                <el-icon><DocumentCopy /></el-icon>
                复制
              </el-button>
              <el-button
                size="small"
                text
                type="primary"
                @click.stop="handleOpenInNewTab(row)"
              >
                在新标签页打开
              </el-button>
              <el-button
                size="small"
                text
                type="danger"
                @click.stop="handleDelete(row)"
              >
                删除
              </el-button>
            </el-space>
          </template>
        </el-table-column>
      </el-table>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Refresh, Delete, Search, DocumentCopy } from '@element-plus/icons-vue'
import { getQueryHistory, clearQueryHistory, deleteQueryHistoryItem, type QueryHistoryItem } from '/@/utils/queryHistory'
import openNewTab from '/@/utils/tinydb/openNewTab'
import { copyTextToClipboard } from '/@/utils/tinydb/clipboard'
import { debounce } from 'lodash-es'

const searchText = ref('')
const history = ref<QueryHistoryItem[]>([])
const tableHeight = ref<number>(400)
const pageContentRef = ref<HTMLElement | null>(null)
const loading = ref(false)

const filteredHistory = computed(() => {
  if (!searchText.value.trim()) {
    return history.value
  }
  const keyword = searchText.value.toLowerCase()
  return history.value.filter(item => 
    item.sql.toLowerCase().includes(keyword) ||
    (item.conid && item.conid.toLowerCase().includes(keyword)) ||
    (item.database && item.database.toLowerCase().includes(keyword))
  )
})

async function loadHistory() {
  loading.value = true
  try {
    await new Promise(resolve => setTimeout(resolve, 100))
    history.value = getQueryHistory()
    history.value.sort((a, b) => b.timestamp - a.timestamp)
  } finally {
    loading.value = false
  }
}

function formatTime(timestamp: number): string {
  const date = new Date(timestamp)
  const now = new Date()
  const diff = now.getTime() - timestamp
  
  if (diff < 24 * 60 * 60 * 1000 && date.getDate() === now.getDate()) {
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  }
  
  if (diff < 48 * 60 * 60 * 1000) {
    return `昨天 ${date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}`
  }
  
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function tableRowClassName() {
  return 'history-row'
}

function handleRowClick(row: QueryHistoryItem) {
  handleOpenInNewTab(row)
}

function handleCopySql(row: QueryHistoryItem) {
  try {
    copyTextToClipboard(row.sql)
    ElMessage.success('SQL 语句已复制到剪贴板')
  } catch (error) {
    ElMessage.error('复制失败，请重试')
    console.error('Failed to copy SQL:', error)
  }
}

async function handleOpenInNewTab(row: QueryHistoryItem) {
  const tempTabId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  
  localStorage.setItem(`sql_query_${tempTabId}`, row.sql)
  
  await openNewTab({
    title: '查询',
    icon: 'icon query',
    tabComponent: 'SqlQueryTab',
    props: {
      conid: row.conid,
      database: row.database,
      noPrefill: !row.conid && !row.database,
      _tempTabId: tempTabId,
    },
    selected: true,
    busy: false
  })
  
  ElMessage.success('已在新标签页打开')
}

function handleDelete(row: QueryHistoryItem) {
  ElMessageBox.confirm(
    '确定要删除这条查询历史吗？',
    '删除确认',
    {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning',
    }
  ).then(() => {
    deleteQueryHistoryItem(row.id)
    loadHistory()
    ElMessage.success('删除成功')
  }).catch(() => {
  })
}

function handleClearAll() {
  ElMessageBox.confirm(
    '确定要清空所有查询历史吗？此操作不可恢复。',
    '清空确认',
    {
      confirmButtonText: '清空',
      cancelButtonText: '取消',
      type: 'warning',
    }
  ).then(() => {
    clearQueryHistory()
    loadHistory()
    ElMessage.success('已清空所有历史')
  }).catch(() => {
  })
}

function updateTableHeight() {
  if (pageContentRef.value) {
    const rect = pageContentRef.value.getBoundingClientRect()
    const searchInputHeight = 32 + 16
    tableHeight.value = Math.max(200, rect.height - searchInputHeight)
  }
}

const debouncedUpdateTableHeight = debounce(updateTableHeight, 100)

onMounted(() => {
  loadHistory()
  updateTableHeight()
  window.addEventListener('resize', debouncedUpdateTableHeight)
  if (pageContentRef.value) {
    const resizeObserver = new ResizeObserver(() => {
      updateTableHeight()
    })
    resizeObserver.observe(pageContentRef.value)
    ;(pageContentRef.value as any).__resizeObserver = resizeObserver
  }
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', debouncedUpdateTableHeight)
  if (pageContentRef.value && (pageContentRef.value as any).__resizeObserver) {
    (pageContentRef.value as any).__resizeObserver.disconnect()
  }
})
</script>

<style scoped>
.query-history-page {
  height: 100%;
  width: 100%;
  display: flex;
  flex-direction: column;
  padding: 16px;
  margin: 0;
  box-sizing: border-box;
  background: var(--theme-bg-0);
  overflow: hidden;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--theme-border);
}

.page-header h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--theme-font-1);
}

.page-content {
  flex: 1;
  min-height: 0;
  min-width: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.search-input {
  margin-bottom: 16px;
  flex-shrink: 0;
}

.sql-preview {
  font-family: 'Courier New', monospace;
  font-size: 12px;
  color: var(--theme-font-2);
  background: var(--theme-bg-1);
  padding: 2px 4px;
  border-radius: 2px;
  white-space: pre-wrap;
  word-break: break-all;
}

:deep(.history-row) {
  cursor: pointer;
}

:deep(.history-row:hover) {
  background-color: var(--theme-bg-hover);
}
</style>
