<template>
  <div class="sql-query-tab">
    <div class="sql-editor-container">
      <div class="sql-toolbar">
        <ToolbarButton 
          icon="icon execute" 
          title="执行 (F5)"
          @click="handleExecute"
        >
          执行
        </ToolbarButton>
        <ToolbarButton 
          icon="icon refresh" 
          title="清除"
          @click="handleClear"
        >
          清除
        </ToolbarButton>
        <div class="sql-info" v-if="conid && database">
          <span>{{ connectionName }} / {{ database }}</span>
        </div>
      </div>
      <div class="editor-wrapper">
        <AceEditor
          :value="sqlContent"
          mode="mysql"
          :options="editorOptions"
          @init="handleEditorInit"
          @input="handleSqlInput"
        />
      </div>
    </div>
    <div class="sql-results-container" v-if="showResults">
      <div class="results-toolbar">
        <span class="results-info">
          {{ resultsInfo }}
        </span>
      </div>
      <div class="results-content">
        <TableDataGrid
          v-if="queryResult"
          :conid="conid"
          :database="database"
          :config="gridConfig"
          :setConfig="setGridConfig"
          :cache="gridCache"
          :setCache="setGridCache"
          :display="queryResultDisplay"
          focusOnVisible
        />
        <div v-else-if="error" class="error-message">
          <div class="error-icon">⚠️</div>
          <div class="error-text">{{ error }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, computed, onMounted, PropType, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useBootstrapStore } from '/@/store/modules/bootstrap'
import AceEditor from '/@/second/query/AceEditor'
import ToolbarButton from '/@/second/buttons/ToolbarButton.vue'
import TableDataGrid from '/@/second/datagrid/TableDataGrid.vue'
import { databaseConnectionsSqlSelectApi } from '/@/api/simpleApis'
import { getConnectionInfo } from '/@/api/bridge'
import { createGridCache, TableGridDisplay } from '/@/second/tinydb-datalib'
import useGridConfig from '/@/second/utility/useGridConfig'
import type * as ace from 'ace-builds'

const props = defineProps({
  tabid: {
    type: String as PropType<string>,
    required: true
  },
  conid: {
    type: String as PropType<string>
  },
  database: {
    type: String as PropType<string>
  }
})

const bootstrap = useBootstrapStore()
const { currentDatabase } = storeToRefs(bootstrap)

const sqlContent = ref('')
const editor = ref<Nullable<ace.Editor>>(null)
const queryResult = ref<any>(null)
const error = ref<string>('')
const showResults = ref(false)
const connectionName = ref('')

const editorOptions = {
  fontSize: 14,
  tabSize: 2,
  useSoftTabs: true,
  wrap: false,
  showLineNumbers: true,
  enableBasicAutocompletion: true,
  enableLiveAutocompletion: true,
  enableSnippets: true,
}

const gridConfig = useGridConfig(props.tabid)
const gridCache = ref(createGridCache())

function setGridConfig(updater: any) {
  if (updater) gridConfig.value = updater(gridConfig.value)
}

function setGridCache(updater: any) {
  if (updater) gridCache.value = updater(gridCache.value)
}

const queryResultDisplay = computed(() => {
  if (!queryResult.value) return null
  return new TableGridDisplay(queryResult.value)
})

const resultsInfo = computed(() => {
  if (error.value) return `错误: ${error.value}`
  if (queryResult.value) {
    const rowCount = Array.isArray(queryResult.value.rows) ? queryResult.value.rows.length : 0
    const colCount = Array.isArray(queryResult.value.columns) ? queryResult.value.columns.length : 0
    return `查询成功，返回 ${rowCount} 行，${colCount} 列`
  }
  return ''
})

// 获取当前数据库连接信息
const currentConid = computed(() => props.conid || currentDatabase.value?.connection?._id)
const currentDatabaseName = computed(() => props.database || currentDatabase.value?.name)

onMounted(async () => {
  // 加载保存的 SQL 内容
  const savedContent = localStorage.getItem(`sql_query_${props.tabid}`)
  if (savedContent) {
    sqlContent.value = savedContent
  } else {
    sqlContent.value = '-- 请输入 SQL 查询语句\nSELECT * FROM table_name LIMIT 100;'
  }

  // 获取连接名称
  if (currentConid.value) {
    try {
      const conn = await getConnectionInfo({ conid: currentConid.value })
      connectionName.value = conn?.displayName || conn?.host || 'Unknown'
    } catch (e) {
      console.error('Failed to get connection info:', e)
    }
  }
})

// 保存 SQL 内容
watch(() => sqlContent.value, (newVal) => {
  if (newVal) {
    localStorage.setItem(`sql_query_${props.tabid}`, newVal)
  }
})

function handleEditorInit(editorInstance: ace.Editor) {
  editor.value = editorInstance
  
  // 添加快捷键：F5 执行查询
  editorInstance.commands.addCommand({
    name: 'executeQuery',
    bindKey: { win: 'F5', mac: 'F5' },
    exec: () => {
      handleExecute()
    }
  })
}

function handleSqlInput(value: string) {
  sqlContent.value = value
}

async function handleExecute() {
  if (!currentConid.value || !currentDatabaseName.value) {
    error.value = '请先选择数据库连接'
    showResults.value = true
    return
  }

  const sql = sqlContent.value.trim()
  if (!sql) {
    error.value = '请输入 SQL 查询语句'
    showResults.value = true
    return
  }

  error.value = ''
  queryResult.value = null
  showResults.value = true

  try {
    const result = await databaseConnectionsSqlSelectApi({
      conid: currentConid.value,
      database: currentDatabaseName.value,
      select: { sql }
    })

    // API 返回格式: { msgtype, rows: { rows: [...], columns: [...] } }
    if (result && result.rows) {
      // result.rows 是 MysqlRowsResult，包含 rows 和 columns
      queryResult.value = result.rows
      error.value = ''
    } else {
      error.value = '查询返回空结果'
    }
  } catch (err: any) {
    error.value = err.message || err.toString() || '执行 SQL 查询时发生错误'
    queryResult.value = null
    console.error('SQL execution error:', err)
  }
}

function handleClear() {
  sqlContent.value = ''
  queryResult.value = null
  error.value = ''
  showResults.value = false
  localStorage.removeItem(`sql_query_${props.tabid}`)
}
</script>

<style scoped>
.sql-query-tab {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--theme-bg-1);
}

.sql-editor-container {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
}

.sql-toolbar {
  display: flex;
  align-items: center;
  padding: 4px 8px;
  background: var(--theme-bg-1);
  border-bottom: 1px solid var(--theme-border);
  gap: 8px;
}

.sql-info {
  margin-left: auto;
  font-size: 12px;
  color: var(--theme-font-3);
}

.editor-wrapper {
  flex: 1;
  min-height: 0;
  position: relative;
}

.sql-results-container {
  display: flex;
  flex-direction: column;
  height: 50%;
  border-top: 1px solid var(--theme-border);
  background: var(--theme-bg-1);
}

.results-toolbar {
  padding: 4px 8px;
  background: var(--theme-bg-2);
  border-bottom: 1px solid var(--theme-border);
  font-size: 12px;
  color: var(--theme-font-2);
}

.results-content {
  flex: 1;
  overflow: auto;
  min-height: 0;
}

.error-message {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px;
  color: var(--theme-icon-red);
}

.error-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.error-text {
  font-size: 14px;
  text-align: center;
  max-width: 600px;
}
</style>

