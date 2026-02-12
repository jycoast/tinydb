<template>
  <BasicModal
    @register="register"
    @ok="handleSubmit"
    title="创建表"
    width="800px"
    :confirmLoading="submitting"
  >
    <Alert
      v-if="errorMessage"
      type="error"
      :message="errorMessage"
      show-icon
      closable
      @close="errorMessage = ''"
      style="margin-bottom: 16px;"
    />
    
    <a-form
      :model="formData"
      :rules="rules"
      ref="formRef"
      :label-col="{ span: 6 }"
      :wrapper-col="{ span: 18 }"
    >
      <a-form-item label="表名" name="tableName">
        <a-input
          v-model:value="formData.tableName"
          placeholder="请输入表名"
          :maxlength="64"
        />
      </a-form-item>
    </a-form>

    <div style="margin-top: 16px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
        <span style="font-weight: 500;">列定义</span>
        <a-button type="dashed" @click="handleAddColumn" :icon="h(PlusOutlined)">
          添加列
        </a-button>
      </div>

      <a-table
        :columns="columnTableColumns"
        :data-source="formData.columns"
        :pagination="false"
        size="small"
        bordered
      >
        <template #bodyCell="{ column, record, index }">
          <template v-if="column.key === 'columnName'">
            <a-input
              v-model:value="record.columnName"
              placeholder="列名"
              size="small"
            />
          </template>
          <template v-else-if="column.key === 'dataType'">
            <a-select
              v-model:value="record.dataType"
              placeholder="数据类型"
              size="small"
              style="width: 120px;"
            >
              <a-select-option value="INT">INT</a-select-option>
              <a-select-option value="BIGINT">BIGINT</a-select-option>
              <a-select-option value="VARCHAR">VARCHAR</a-select-option>
              <a-select-option value="TEXT">TEXT</a-select-option>
              <a-select-option value="DECIMAL">DECIMAL</a-select-option>
              <a-select-option value="FLOAT">FLOAT</a-select-option>
              <a-select-option value="DOUBLE">DOUBLE</a-select-option>
              <a-select-option value="DATE">DATE</a-select-option>
              <a-select-option value="DATETIME">DATETIME</a-select-option>
              <a-select-option value="TIMESTAMP">TIMESTAMP</a-select-option>
              <a-select-option value="BOOLEAN">BOOLEAN</a-select-option>
            </a-select>
          </template>
          <template v-else-if="column.key === 'length'">
            <a-input-number
              v-model:value="record.charMaxLength"
              placeholder="长度"
              size="small"
              :min="0"
              style="width: 100px;"
              v-if="needsLength(record.dataType)"
            />
            <span v-else style="color: #999;">-</span>
          </template>
          <template v-else-if="column.key === 'nullable'">
            <a-checkbox v-model:checked="record.isNullable" />
          </template>
          <template v-else-if="column.key === 'primaryKey'">
            <a-checkbox v-model:checked="record.isPrimaryKey" @change="handlePrimaryKeyChange(index)" />
          </template>
          <template v-else-if="column.key === 'autoIncrement'">
            <a-checkbox v-model:checked="record.autoIncrement" />
          </template>
          <template v-else-if="column.key === 'defaultValue'">
            <a-input
              v-model:value="record.defaultValue"
              placeholder="默认值"
              size="small"
              style="width: 120px;"
            />
          </template>
          <template v-else-if="column.key === 'comment'">
            <a-input
              v-model:value="record.columnComment"
              placeholder="注释"
              size="small"
            />
          </template>
          <template v-else-if="column.key === 'action'">
            <a-button
              type="link"
              danger
              size="small"
              @click="handleRemoveColumn(index)"
              :icon="h(DeleteOutlined)"
            >
              删除
            </a-button>
          </template>
        </template>
      </a-table>

      <a-empty
        v-if="formData.columns.length === 0"
        description="请至少添加一列"
        style="margin: 16px 0;"
      />
    </div>
  </BasicModal>
</template>

<script lang="ts" setup>
import { ref, reactive, h } from 'vue'
import { BasicModal, useModalInner } from '/@/components/Modal'
import { Alert, Form as AForm, FormItem as AFormItem, Input as AInput, InputNumber as AInputNumber, Select as ASelect, Table as ATable, Button as AButton, Checkbox as ACheckbox, Empty as AEmpty } from 'ant-design-vue'
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons-vue'
import {databaseConnectionsCreateTableApi} from "/@/api"
import { useMessage } from '/@/hooks/web/useMessage'

const ASelectOption = ASelect.Option

const { createMessage } = useMessage()

const [register, { closeModal }] = useModalInner((data) => {
  if (data?.conid) {
    formData.conid = data.conid
  }
  if (data?.database) {
    formData.database = data.database
  }
  formData.tableName = ''
  formData.columns = []
  errorMessage.value = ''
  submitting.value = false
  formRef.value?.resetFields()
  // 添加一个默认列
  handleAddColumn()
})

const formRef = ref()
const errorMessage = ref('')
const submitting = ref(false)
const formData = reactive({
  conid: '',
  database: '',
  tableName: '',
  columns: [] as any[],
})

const rules = {
  tableName: [
    { required: true, message: '请输入表名', trigger: 'blur' },
    { 
      pattern: /^[a-zA-Z0-9_]+$/, 
      message: '表名只能包含字母、数字和下划线', 
      trigger: 'blur' 
    },
    { min: 1, max: 64, message: '表名长度在1-64个字符之间', trigger: 'blur' }
  ],
}

const columnTableColumns = [
  { title: '列名', key: 'columnName', width: 150 },
  { title: '数据类型', key: 'dataType', width: 130 },
  { title: '长度', key: 'length', width: 100 },
  { title: '允许NULL', key: 'nullable', width: 100 },
  { title: '主键', key: 'primaryKey', width: 80 },
  { title: '自增', key: 'autoIncrement', width: 80 },
  { title: '默认值', key: 'defaultValue', width: 130 },
  { title: '注释', key: 'comment', width: 150 },
  { title: '操作', key: 'action', width: 80 },
]

function needsLength(dataType: string): boolean {
  return ['VARCHAR', 'CHAR', 'DECIMAL', 'FLOAT', 'DOUBLE'].includes(dataType)
}

function handleAddColumn() {
  formData.columns.push({
    columnName: '',
    dataType: 'VARCHAR',
    charMaxLength: null,
    numericPrecision: null,
    numericScale: null,
    isNullable: true,
    isPrimaryKey: false,
    autoIncrement: false,
    defaultValue: '',
    columnComment: '',
    extra: '',
  })
}

function handleRemoveColumn(index: number) {
  formData.columns.splice(index, 1)
}

function handlePrimaryKeyChange(index: number) {
  const column = formData.columns[index]
  if (column.isPrimaryKey) {
    // 取消其他列的主键
    formData.columns.forEach((col, i) => {
      if (i !== index) {
        col.isPrimaryKey = false
      }
    })
    // 主键不能为NULL
    column.isNullable = false
  }
}

const handleSubmit = async () => {
  try {
    await formRef.value?.validate()
    
    if (!formData.conid || !formData.database) {
      errorMessage.value = '连接ID或数据库名称不能为空'
      return
    }
    
    if (formData.columns.length === 0) {
      errorMessage.value = '请至少添加一列'
      return
    }

    // 验证列
    for (let i = 0; i < formData.columns.length; i++) {
      const col = formData.columns[i]
      if (!col.columnName || !col.columnName.trim()) {
        errorMessage.value = `第 ${i + 1} 列的列名不能为空`
        return
      }
      if (!col.dataType) {
        errorMessage.value = `第 ${i + 1} 列的数据类型不能为空`
        return
      }
    }

    submitting.value = true
    errorMessage.value = ''

    // 转换列数据格式
    const columns = formData.columns.map(col => {
      const columnData: any = {
        columnName: col.columnName.trim(),
        dataType: col.dataType,
        isNullable: col.isNullable ? 'YES' : 'NO',
        defaultValue: col.defaultValue || null,
        columnComment: col.columnComment || '',
        extra: '',
      }

      // 设置长度
      if (needsLength(col.dataType) && col.charMaxLength) {
        columnData.charMaxLength = col.charMaxLength
      }

      // 设置主键和自增
      if (col.isPrimaryKey) {
        columnData.extra = 'PRI'
        if (col.autoIncrement) {
          columnData.extra += ' auto_increment'
        }
      }

      return columnData
    })

    const result = await databaseConnectionsCreateTableApi({
      conid: formData.conid,
      database: formData.database,
      tableName: formData.tableName.trim(),
      columns,
    })
    
    if (result && (result as any).errorMessage) {
      errorMessage.value = (result as any).errorMessage
      createMessage.error('创建表失败')
    } else {
      createMessage.success('表创建成功！')
      closeModal()
      // 刷新数据库结构
      const { databaseConnectionsRefreshApi } = await import('/@/api/simpleApis')
      await databaseConnectionsRefreshApi({ 
        conid: formData.conid, 
        database: formData.database, 
        keepOpen: true 
      })
    }
  } catch (e: any) {
    if (e?.errorFields) {
      // 表单验证错误
      return
    }
    errorMessage.value = e?.message || e?.toString() || '创建表失败'
    createMessage.error(errorMessage.value)
  } finally {
    submitting.value = false
  }
}
</script>
