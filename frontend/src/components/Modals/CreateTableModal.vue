<template>
  <BasicModal
    @register="handleRegister"
    @ok="handleSubmit"
    title="创建表"
    width="800px"
    :confirmLoading="submitting"
  >
    <el-alert
      v-if="errorMessage"
      type="error"
      :title="errorMessage"
      show-icon
      closable
      @close="errorMessage = ''"
      style="margin-bottom: 16px"
    />
    <el-form
      :model="formData"
      :rules="rules"
      ref="formRef"
      :label-position="'left'"
      label-width="100px"
    >
      <el-form-item label="表名" prop="tableName">
        <el-input
          v-model="formData.tableName"
          placeholder="请输入表名"
          :maxlength="64"
          show-word-limit
        />
      </el-form-item>
    </el-form>

    <div style="margin-top: 16px">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px">
        <span style="font-weight: 500">列定义</span>
        <el-button type="primary" plain @click="handleAddColumn">
          <el-icon><Plus /></el-icon>
          添加列
        </el-button>
      </div>

      <el-table :data="formData.columns" border size="small" max-height="300">
        <el-table-column prop="columnName" label="列名" width="130">
          <template #default="{row}">
            <el-input v-model="row.columnName" placeholder="列名" size="small" />
          </template>
        </el-table-column>
        <el-table-column prop="dataType" label="数据类型" width="130">
          <template #default="{row}">
            <el-select v-model="row.dataType" placeholder="类型" size="small" style="width: 100%">
              <el-option value="INT" label="INT" />
              <el-option value="BIGINT" label="BIGINT" />
              <el-option value="VARCHAR" label="VARCHAR" />
              <el-option value="TEXT" label="TEXT" />
              <el-option value="DECIMAL" label="DECIMAL" />
              <el-option value="FLOAT" label="FLOAT" />
              <el-option value="DOUBLE" label="DOUBLE" />
              <el-option value="DATE" label="DATE" />
              <el-option value="DATETIME" label="DATETIME" />
              <el-option value="TIMESTAMP" label="TIMESTAMP" />
              <el-option value="BOOLEAN" label="BOOLEAN" />
            </el-select>
          </template>
        </el-table-column>
        <el-table-column label="长度" width="90">
          <template #default="{row}">
            <el-input-number
              v-if="needsLength(row.dataType)"
              v-model="row.charMaxLength"
              :min="0"
              size="small"
              controls-position="right"
              style="width: 80px"
            />
            <span v-else style="color: #999">-</span>
          </template>
        </el-table-column>
        <el-table-column label="允许NULL" width="90">
          <template #default="{row}">
            <el-checkbox v-model="row.isNullable" />
          </template>
        </el-table-column>
        <el-table-column label="主键" width="70">
          <template #default="scope">
            <el-checkbox v-model="scope.row.isPrimaryKey" @change="handlePrimaryKeyChange(scope.$index)" />
          </template>
        </el-table-column>
        <el-table-column label="自增" width="70">
          <template #default="{row}">
            <el-checkbox v-model="row.autoIncrement" />
          </template>
        </el-table-column>
        <el-table-column label="默认值" width="110">
          <template #default="{row}">
            <el-input v-model="row.defaultValue" placeholder="默认值" size="small" />
          </template>
        </el-table-column>
        <el-table-column label="注释" width="120">
          <template #default="{row}">
            <el-input v-model="row.columnComment" placeholder="注释" size="small" />
          </template>
        </el-table-column>
        <el-table-column label="操作" width="80" fixed="right">
          <template #default="scope">
            <el-button type="danger" link size="small" @click="handleRemoveColumn(scope.$index)">
              <el-icon><Delete /></el-icon>
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-empty v-if="formData.columns.length === 0" description="请至少添加一列" style="margin: 16px 0" />
    </div>
  </BasicModal>
</template>

<script lang="ts" setup>
import {ref, reactive} from "vue"
import {Plus, Delete} from "@element-plus/icons-vue"
import {BasicModal, useModalInner} from "/@/components/Modals"
import {databaseConnectionsCreateTableApi} from "/@/api"
import {useMessage} from "/@/hooks/web/useMessage"

const emit = defineEmits(["register"])
const {createMessage} = useMessage()

const [register, {closeModal}] = useModalInner((data) => {
  if (data?.conid) formData.conid = data.conid
  if (data?.database) formData.database = data.database
  formData.tableName = ""
  formData.columns = []
  errorMessage.value = ""
  submitting.value = false
  formRef.value?.resetFields()
  handleAddColumn()
})
function handleRegister(m: any, u: string) {
  register(m, u)
  emit('register', m, u)
}

const formRef = ref()
const errorMessage = ref("")
const submitting = ref(false)
const formData = reactive({
  conid: "",
  database: "",
  tableName: "",
  columns: [] as any[],
})

const rules = {
  tableName: [
    {required: true, message: "请输入表名", trigger: "blur"},
    {pattern: /^[a-zA-Z0-9_]+$/, message: "表名只能包含字母、数字和下划线", trigger: "blur"},
    {min: 1, max: 64, message: "表名长度在1-64个字符之间", trigger: "blur"},
  ],
}

function needsLength(dataType: string): boolean {
  return ["VARCHAR", "CHAR", "DECIMAL", "FLOAT", "DOUBLE"].includes(dataType)
}

function handleAddColumn() {
  formData.columns.push({
    columnName: "",
    dataType: "VARCHAR",
    charMaxLength: null,
    numericPrecision: null,
    numericScale: null,
    isNullable: true,
    isPrimaryKey: false,
    autoIncrement: false,
    defaultValue: "",
    columnComment: "",
    extra: "",
  })
}

function handleRemoveColumn(index: number) {
  formData.columns.splice(index, 1)
}

function handlePrimaryKeyChange(index: number) {
  const column = formData.columns[index]
  if (column.isPrimaryKey) {
    formData.columns.forEach((col, i) => {
      if (i !== index) col.isPrimaryKey = false
    })
    column.isNullable = false
  }
}

async function handleSubmit() {
  try {
    await formRef.value?.validate()
    if (!formData.conid || !formData.database) {
      errorMessage.value = "连接ID或数据库名称不能为空"
      return
    }
    if (formData.columns.length === 0) {
      errorMessage.value = "请至少添加一列"
      return
    }
    for (let i = 0; i < formData.columns.length; i++) {
      const col = formData.columns[i]
      if (!col.columnName?.trim()) {
        errorMessage.value = `第 ${i + 1} 列的列名不能为空`
        return
      }
      if (!col.dataType) {
        errorMessage.value = `第 ${i + 1} 列的数据类型不能为空`
        return
      }
    }

    submitting.value = true
    errorMessage.value = ""

    const columns = formData.columns.map((col) => {
      const columnData: any = {
        columnName: col.columnName.trim(),
        dataType: col.dataType,
        isNullable: col.isNullable ? "YES" : "NO",
        defaultValue: col.defaultValue || null,
        columnComment: col.columnComment || "",
        extra: "",
      }
      if (needsLength(col.dataType) && col.charMaxLength) {
        columnData.charMaxLength = col.charMaxLength
      }
      if (col.isPrimaryKey) {
        columnData.extra = "PRI"
        if (col.autoIncrement) columnData.extra += " auto_increment"
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
      createMessage.error("创建表失败")
    } else {
      createMessage.success("表创建成功！")
      closeModal()
      const {databaseConnectionsRefreshApi} = await import("/@/api")
      await databaseConnectionsRefreshApi({
        conid: formData.conid,
        database: formData.database,
        keepOpen: true,
      })
    }
  } catch (e: any) {
    if (e?.message) return
    errorMessage.value = e?.message || e?.toString() || "创建表失败"
    createMessage.error(errorMessage.value)
  } finally {
    submitting.value = false
  }
}
</script>
