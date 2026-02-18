<template>
  <BasicModal
    @register="register as any"
    @ok="handleExecute"
    :title="`设计表 - ${tableDisplayName}`"
    width="80%"
    :show-cancel-btn="true"
    :show-ok-btn="pendingChanges.length > 0"
    ok-text="执行变更"
    cancel-text="取消"
    :confirm-loading="executing"
    :mask-closable="false"
  >
    <div class="table-design-container">
      <!-- Tabs for different sections -->
      <el-tabs v-model="activeTab" class="design-tabs">
        <!-- Fields Tab -->
        <el-tab-pane label="字段" name="fields">
          <div class="fields-section">
            <div class="section-header">
              <h3>字段管理</h3>
              <el-button type="primary" size="small" @click="addField">
                <el-icon><Plus /></el-icon>
                添加字段
              </el-button>
            </div>
            
            <el-table 
              :data="fields" 
              border 
              size="small" 
              max-height="400"
              class="fields-table"
            >
              <el-table-column prop="columnName" label="字段名" width="150">
                <template #default="{ row, $index }">
                  <el-input 
                    v-model="row.columnName" 
                    size="small"
                    @blur="validateFieldName(row, $index)"
                  />
                </template>
              </el-table-column>
              
              <el-table-column prop="dataType" label="类型" width="120">
                <template #default="{ row }">
                  <el-select 
                    v-model="row.dataType" 
                    size="small" 
                    filterable
                    allow-create
                    default-first-option
                    @change="onDataTypeChange(row)"
                  >
                    <el-option
                      v-for="type in dataTypeOptions"
                      :key="type"
                      :label="type"
                      :value="type"
                    />
                  </el-select>
                </template>
              </el-table-column>
              
              <el-table-column prop="dataLength" label="长度/值" width="100">
                <template #default="{ row }">
                  <el-input 
                    v-model="row.dataLength" 
                    size="small"
                    placeholder="如: 255"
                  />
                </template>
              </el-table-column>
              
              <el-table-column prop="nullable" label="允许空" width="80" align="center">
                <template #default="{ row }">
                  <el-checkbox v-model="row.nullable" />
                </template>
              </el-table-column>
              
              <el-table-column prop="defaultValue" label="默认值" width="120">
                <template #default="{ row }">
                  <el-input 
                    v-model="row.defaultValue" 
                    size="small"
                    placeholder="默认值"
                  />
                </template>
              </el-table-column>
              
              <el-table-column prop="columnComment" label="备注" min-width="150">
                <template #default="{ row }">
                  <el-input 
                    v-model="row.columnComment" 
                    size="small"
                    placeholder="字段备注"
                  />
                </template>
              </el-table-column>
              
              <el-table-column label="操作" width="80" fixed="right">
                <template #default="{ $index }">
                  <el-button 
                    type="danger" 
                    size="small" 
                    link
                    @click="removeField($index)"
                  >
                    删除
                  </el-button>
                </template>
              </el-table-column>
            </el-table>
          </div>
        </el-tab-pane>
        
        <!-- Indexes Tab -->
        <el-tab-pane label="索引" name="indexes">
          <div class="indexes-section">
            <div class="section-header">
              <h3>索引管理</h3>
              <el-button type="primary" size="small" @click="addIndex">
                <el-icon><Plus /></el-icon>
                添加索引
              </el-button>
            </div>
            
            <el-table 
              :data="indexes" 
              border 
              size="small" 
              max-height="400"
            >
              <el-table-column prop="indexName" label="索引名" width="150">
                <template #default="{ row }">
                  <el-input 
                    v-model="row.indexName" 
                    size="small"
                  />
                </template>
              </el-table-column>
              
              <el-table-column prop="indexType" label="类型" width="120">
                <template #default="{ row }">
                  <el-select v-model="row.indexType" size="small">
                    <el-option label="INDEX" value="INDEX" />
                    <el-option label="UNIQUE" value="UNIQUE" />
                    <el-option label="FULLTEXT" value="FULLTEXT" />
                  </el-select>
                </template>
              </el-table-column>
              
              <el-table-column prop="columns" label="包含字段" min-width="200">
                <template #default="{ row }">
                  <el-select 
                    v-model="row.columns" 
                    size="small" 
                    multiple
                    filterable
                    placeholder="选择字段"
                  >
                    <el-option
                      v-for="field in fields"
                      :key="field.columnName"
                      :label="field.columnName"
                      :value="field.columnName"
                    />
                  </el-select>
                </template>
              </el-table-column>
              
              <el-table-column label="操作" width="80" fixed="right">
                <template #default="{ $index }">
                  <el-button 
                    type="danger" 
                    size="small" 
                    link
                    @click="removeIndex($index)"
                  >
                    删除
                  </el-button>
                </template>
              </el-table-column>
            </el-table>
          </div>
        </el-tab-pane>
        
        <!-- SQL Preview Tab -->
        <el-tab-pane label="SQL 预览" name="sql">
          <div class="sql-preview-section">
            <div class="section-header">
              <h3>SQL 预览</h3>
              <el-button type="primary" size="small" @click="copySQL">
                <el-icon><DocumentCopy /></el-icon>
                复制 SQL
              </el-button>
            </div>
            
            <el-alert
              v-if="pendingChanges.length > 0"
              :title="`检测到 ${pendingChanges.length} 个待执行的变更`"
              type="warning"
              show-icon
              class="changes-alert"
            />
            
            <el-input
              v-model="sqlPreview"
              type="textarea"
              :rows="15"
              readonly
              class="sql-textarea"
              placeholder="暂无变更"
            />
          </div>
        </el-tab-pane>
      </el-tabs>
    </div>
  </BasicModal>
</template>

<script lang="ts" setup>
import { ref, computed, watch, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, DocumentCopy } from '@element-plus/icons-vue'
import { BasicModal, useModalInner } from '/@/components/Modals'
import { databaseConnectionsSqlSelectApi } from '/@/api'
import { saveQueryHistory } from '/@/utils/queryHistory'

interface Field {
  columnName: string
  dataType: string
  dataLength: string
  nullable: boolean
  defaultValue: string
  columnComment: string
  isPrimaryKey: boolean
  isAutoIncrement: boolean
  original?: any // 原始字段信息，用于检测变更
}

interface Index {
  indexName: string
  indexType: 'INDEX' | 'UNIQUE' | 'FULLTEXT'
  columns: string[]
  original?: any // 原始索引信息
}

interface Props {
  conid?: string
  database?: string
  schemaName?: string
  pureName?: string
  tableStructure?: any
}

const props = withDefaults(defineProps<Props>(), {
  schemaName: ''
})

const [register, { closeModal }] = useModalInner((data: any) => {
  initData(data)
})

// State
const activeTab = ref('fields')
const fields = ref<Field[]>([])
const indexes = ref<Index[]>([])
const pendingChanges = ref<string[]>([])
const executing = ref(false)
const originalFields = ref<Field[]>([])
const originalIndexes = ref<Index[]>([])

// Computed
const tableDisplayName = computed(() => 
  props.schemaName ? `${props.schemaName}.${props.pureName}` : props.pureName || ''
)

const sqlPreview = computed(() => {
  return pendingChanges.value.join('\n\n')
})

// Data type options (可以根据不同数据库动态调整)
const dataTypeOptions = [
  'INT', 'BIGINT', 'SMALLINT', 'TINYINT',
  'VARCHAR', 'CHAR', 'TEXT', 'LONGTEXT',
  'DATE', 'DATETIME', 'TIMESTAMP',
  'DECIMAL', 'FLOAT', 'DOUBLE',
  'BOOLEAN', 'JSON', 'BLOB'
]

// 初始化数据
function initData(data: any) {
  // Reset state before initializing
  resetState()
  
  if (data.tableStructure) {
    initializeFromTableStructure(data.tableStructure)
  }
}

function initializeFromTableStructure(table: any) {
  // 初始化字段
  if (table.columns && Array.isArray(table.columns)) {
    fields.value = table.columns.map((col: any) => {
      const field: Field = {
        columnName: col.columnName || '',
        dataType: col.dataType || '',
        dataLength: col.dataLength || col.characterMaximumLength || col.numericPrecision || '',
        nullable: col.isNullable === 'YES' || col.isNullable === true,
        defaultValue: col.columnDefault || '',
        columnComment: col.columnComment || '',
        isPrimaryKey: col.constraint === 'PRIMARY KEY',
        isAutoIncrement: col.extra === 'auto_increment',
        original: { ...col }
      }
      return field
    })
    originalFields.value = JSON.parse(JSON.stringify(fields.value))
  }
  
  // 初始化索引
  if (table.indexes && Array.isArray(table.indexes)) {
    indexes.value = table.indexes.map((idx: any) => {
      const index: Index = {
        indexName: idx.indexName || '',
        indexType: idx.isUnique ? 'UNIQUE' : 'INDEX',
        columns: idx.columns || [],
        original: { ...idx }
      }
      return index
    })
    originalIndexes.value = JSON.parse(JSON.stringify(indexes.value))
  }
  
  updatePendingChanges()
}

// Field management
function addField() {
  fields.value.push({
    columnName: '',
    dataType: 'VARCHAR',
    dataLength: '255',
    nullable: true,
    defaultValue: '',
    columnComment: '',
    isPrimaryKey: false,
    isAutoIncrement: false
  })
  updatePendingChanges()
}

function removeField(index: number) {
  fields.value.splice(index, 1)
  updatePendingChanges()
}

function validateFieldName(row: Field, index: number) {
  if (!row.columnName.trim()) {
    ElMessage.warning('字段名不能为空')
    return
  }
  
  // 检查重复字段名
  const duplicateCount = fields.value.filter((field, i) => 
    i !== index && field.columnName === row.columnName
  ).length
  
  if (duplicateCount > 0) {
    ElMessage.warning('字段名不能重复')
  }
  
  updatePendingChanges()
}

function onDataTypeChange(row: Field) {
  // 根据数据类型自动设置长度
  if (row.dataType === 'VARCHAR' && !row.dataLength) {
    row.dataLength = '255'
  } else if (row.dataType === 'INT' && !row.dataLength) {
    row.dataLength = '11'
  }
  updatePendingChanges()
}

// Index management
function addIndex() {
  indexes.value.push({
    indexName: '',
    indexType: 'INDEX',
    columns: []
  })
  updatePendingChanges()
}

function removeIndex(index: number) {
  indexes.value.splice(index, 1)
  updatePendingChanges()
}

// Change detection and SQL generation
function updatePendingChanges() {
  const changes: string[] = []
  
  // 检测字段变更
  const fieldChanges = detectFieldChanges()
  changes.push(...fieldChanges)
  
  // 检测索引变更
  const indexChanges = detectIndexChanges()
  changes.push(...indexChanges)
  
  pendingChanges.value = changes
}

function detectFieldChanges(): string[] {
  const changes: string[] = []
  const tableName = props.schemaName 
    ? `${props.schemaName}.${props.pureName}` 
    : props.pureName
  
  // 检测新增字段
  const newFields = fields.value.filter(field => 
    !field.original && field.columnName.trim()
  )
  
  newFields.forEach(field => {
    const sql = generateAddColumnSQL(field)
    changes.push(sql)
  })
  
  // 检测修改字段
  const modifiedFields = fields.value.filter(field => {
    if (!field.original || !field.columnName.trim()) return false
    
    const original = field.original
    return field.columnName !== original.columnName ||
           field.dataType !== original.dataType ||
           field.dataLength !== (original.dataLength || original.characterMaximumLength || original.numericPrecision || '') ||
           field.nullable !== (original.isNullable === 'YES' || original.isNullable === true) ||
           field.defaultValue !== (original.columnDefault || '') ||
           field.columnComment !== (original.columnComment || '')
  })
  
  modifiedFields.forEach(field => {
    const sql = generateModifyColumnSQL(field)
    changes.push(sql)
  })
  
  // 检测删除字段
  const deletedFields = originalFields.value.filter(origField => {
    return !fields.value.some(field => 
      field.original && field.original.columnName === origField.columnName
    )
  })
  
  deletedFields.forEach(field => {
    const sql = `ALTER TABLE ${tableName} DROP COLUMN ${field.columnName};`
    changes.push(sql)
  })
  
  return changes
}

function detectIndexChanges(): string[] {
  const changes: string[] = []
  const tableName = props.schemaName 
    ? `${props.schemaName}.${props.pureName}` 
    : props.pureName
  
  // 检测新增索引
  const newIndexes = indexes.value.filter(idx => 
    !idx.original && idx.indexName.trim() && idx.columns.length > 0
  )
  
  newIndexes.forEach(idx => {
    const sql = generateCreateIndexSQL(idx)
    changes.push(sql)
  })
  
  // 检测删除索引
  const deletedIndexes = originalIndexes.value.filter(origIdx => {
    return !indexes.value.some(idx => 
      idx.original && idx.original.indexName === origIdx.indexName
    )
  })
  
  deletedIndexes.forEach(idx => {
    const sql = `DROP INDEX ${idx.indexName} ON ${tableName};`
    changes.push(sql)
  })
  
  return changes
}

function generateAddColumnSQL(field: Field): string {
  const tableName = props.schemaName 
    ? `${props.schemaName}.${props.pureName}` 
    : props.pureName
  
  let definition = `${field.columnName} ${field.dataType}`
  
  if (field.dataLength && field.dataLength.trim()) {
    definition += `(${field.dataLength})`
  }
  
  if (!field.nullable) {
    definition += ' NOT NULL'
  }
  
  if (field.defaultValue !== null && field.defaultValue !== undefined && field.defaultValue !== '') {
    definition += ` DEFAULT '${field.defaultValue}'`
  }
  
  if (field.columnComment) {
    definition += ` COMMENT '${field.columnComment}'`
  }
  
  return `ALTER TABLE ${tableName} ADD COLUMN ${definition};`
}

function generateModifyColumnSQL(field: Field): string {
  const tableName = props.schemaName 
    ? `${props.schemaName}.${props.pureName}` 
    : props.pureName
  
  let definition = `${field.columnName} ${field.dataType}`
  
  if (field.dataLength && field.dataLength.trim()) {
    definition += `(${field.dataLength})`
  }
  
  if (!field.nullable) {
    definition += ' NOT NULL'
  } else {
    definition += ' NULL'
  }
  
  if (field.defaultValue !== null && field.defaultValue !== undefined && field.defaultValue !== '') {
    definition += ` DEFAULT '${field.defaultValue}'`
  } else if (!field.nullable) {
    definition += ' DEFAULT ""'
  }
  
  if (field.columnComment) {
    definition += ` COMMENT '${field.columnComment}'`
  }
  
  return `ALTER TABLE ${tableName} MODIFY COLUMN ${definition};`
}

function generateCreateIndexSQL(index: Index): string {
  const tableName = props.schemaName 
    ? `${props.schemaName}.${props.pureName}` 
    : props.pureName
  
  const columns = index.columns.map(col => `\`${col}\``).join(', ')
  
  if (index.indexType === 'UNIQUE') {
    return `CREATE UNIQUE INDEX ${index.indexName} ON ${tableName} (${columns});`
  } else {
    return `CREATE INDEX ${index.indexName} ON ${tableName} (${columns});`
  }
}

// Copy SQL
async function copySQL() {
  if (!sqlPreview.value) {
    ElMessage.info('没有可复制的SQL')
    return
  }
  
  try {
    await navigator.clipboard.writeText(sqlPreview.value)
    ElMessage.success('SQL已复制到剪贴板')
  } catch (e) {
    ElMessage.error('复制失败')
  }
}

// Execute changes
async function executeChanges() {
  if (pendingChanges.value.length === 0) {
    ElMessage.info('没有待执行的变更')
    return
  }
  
  const confirmText = `确定要执行这 ${pendingChanges.value.length} 个变更吗？此操作不可逆！`
  
  try {
    await ElMessageBox.confirm(confirmText, '执行确认', {
      confirmButtonText: '执行',
      cancelButtonText: '取消',
      type: 'warning'
    })
  } catch {
    return
  }
  
  executing.value = true
  
  try {
    for (const sql of pendingChanges.value) {
      const response = await databaseConnectionsSqlSelectApi({
        conid: props.conid!,
        database: props.database!,
        select: { sql }
      }) as any
      
      if (response?.errorMessage) {
        throw new Error(response.errorMessage)
      }
      
      // 保存到查询历史
      saveQueryHistory(sql, props.conid!, props.database!)
    }
    
    ElMessage.success('所有变更已成功执行')
    
    // 刷新原始数据
    originalFields.value = JSON.parse(JSON.stringify(fields.value))
    originalIndexes.value = JSON.parse(JSON.stringify(indexes.value))
    
    updatePendingChanges()
  } catch (e: any) {
    ElMessage.error(`执行失败：${e?.message || String(e)}`)
  } finally {
    executing.value = false
  }
}

function handleClose() {
  if (pendingChanges.value.length > 0) {
    ElMessageBox.confirm(
      '有未保存的变更，确定要关闭吗？',
      '确认关闭',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消'
      }
    ).then(() => {
      // Reset state when closing
      resetState()
      closeModal()
    }).catch(() => {})
  } else {
    // Reset state when closing
    resetState()
    closeModal()
  }
}

function handleExecute() {
  executeChanges()
}

function resetState() {
  fields.value = []
  indexes.value = []
  pendingChanges.value = []
  originalFields.value = []
  originalIndexes.value = []
  activeTab.value = 'fields'
  executing.value = false
}

// Watch for changes
watch(fields, () => {
  updatePendingChanges()
}, { deep: true })

watch(indexes, () => {
  updatePendingChanges()
}, { deep: true })

onMounted(() => {
  // 组件挂载时的初始化逻辑
})
</script>

<style scoped>
.table-design-container {
  height: 600px;
  display: flex;
  flex-direction: column;
}

.design-tabs {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.design-tabs :deep(.el-tabs__content) {
  flex: 1;
  overflow: hidden;
}

.design-tabs :deep(.el-tab-pane) {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.section-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 500;
}

.fields-section,
.indexes-section,
.sql-preview-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  height: 100%;
}

.fields-table {
  flex: 1;
}

.changes-alert {
  margin-bottom: 16px;
}

.sql-textarea {
  flex: 1;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

/* 暗黑模式适配 */
.dark .table-design-container {
  color: #ffffff;
}

.dark :deep(.el-table) {
  --el-table-border-color: #404040;
  --el-table-header-bg-color: #2d2d2d;
  --el-table-row-hover-bg-color: #3a3a3a;
}

.dark :deep(.el-input__wrapper) {
  background-color: #2d2d2d;
  border-color: #404040;
}

.dark :deep(.el-select .el-input__wrapper) {
  background-color: #2d2d2d;
}

.dark :deep(.el-textarea__inner) {
  background-color: #2d2d2d;
  border-color: #404040;
  color: #ffffff;
}
</style>