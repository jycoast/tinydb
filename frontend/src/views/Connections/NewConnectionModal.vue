<template>
  <BasicModal
    @register="register"
    @ok="handleSubmit"
    title="新建连接"
    width="520px"
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
      <a-form-item label="连接名称" name="name">
        <a-input
          v-model:value="formData.name"
          placeholder="请输入连接名称"
          :maxlength="64"
        />
      </a-form-item>
      <a-form-item label="引擎类型" name="engine">
        <a-select
          v-model:value="formData.engine"
          placeholder="请选择数据库类型"
          allow-clear
          style="width: 100%"
        >
          <a-select-option value="mysql">MySQL</a-select-option>、
        </a-select>
      </a-form-item>
    </a-form>
  </BasicModal>
</template>

<script lang="ts" setup>
import { ref, reactive } from 'vue'
import { BasicModal, useModalInner } from '/@/components/Modal'
import { Alert } from 'ant-design-vue'
import { Form as AForm, FormItem as AFormItem, Input as AInput, Select as ASelect, SelectOption as ASelectOption } from 'ant-design-vue'
import {connectionSaveApi} from "/@/api"
import { useMessage } from '/@/hooks/web/useMessage'
import { useClusterApiStore } from '/@/store/modules/clusterApi'

const { createMessage } = useMessage()
const clusterApi = useClusterApiStore()

const [register, { closeModal }] = useModalInner(() => {
  formData.name = ''
  formData.engine = undefined
  errorMessage.value = ''
  formRef.value?.resetFields()
})

const formRef = ref()
const errorMessage = ref('')
const formData = reactive<{ name: string; engine?: string }>({
  name: '',
  engine: undefined,
})

const rules = {
  name: [
    { required: true, message: '请输入连接名称', trigger: 'blur' },
    { min: 1, max: 64, message: '连接名称长度在1-64个字符之间', trigger: 'blur' }
  ],
  engine: [{ required: true, message: '请选择数据库类型', trigger: 'change' }],
}

const handleSubmit = async () => {
  try {
    await formRef.value?.validate()
    if (!formData.name?.trim()) {
      errorMessage.value = '请输入连接名称'
      return
    }
    if (!formData.engine) {
      errorMessage.value = '请选择数据库类型'
      return
    }

    await connectionSaveApi({
      _id: '',
      name: formData.name.trim(),
      engine: formData.engine,
    } as any)

    createMessage.success('连接保存成功')
    closeModal()
    clusterApi.setConnectionList(await import('/@/api/simpleApis').then(m => m.connectionListApi()))
  } catch (e: any) {
    if (e?.errorFields) return
    errorMessage.value = e?.message || e?.toString() || '保存失败'
    createMessage.error(errorMessage.value)
  }
}
</script>
