<template>
  <BasicModal
    @register="register"
    @ok="handleSubmit"
    title="创建数据库"
    width="500px"
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
      <a-form-item label="数据库名称" name="name">
        <a-input
          v-model:value="formData.name"
          placeholder="请输入数据库名称"
          :maxlength="64"
        />
      </a-form-item>
    </a-form>
  </BasicModal>
</template>

<script lang="ts" setup>
import { ref, reactive } from 'vue'
import { BasicModal, useModalInner } from '/@/components/Modal'
import { Alert } from 'ant-design-vue'
import { Form as AForm, FormItem as AFormItem, Input as AInput } from 'ant-design-vue'
import { serverConnectionsCreateDatabaseApi } from '/@/api/simpleApis'
import { useMessage } from '/@/hooks/web/useMessage'
import { useBootstrapStore } from '/@/store/modules/bootstrap'

const { createMessage } = useMessage()
const bootstrap = useBootstrapStore()

const [register, { closeModal }] = useModalInner((data) => {
  if (data?.conid) {
    formData.conid = data.conid
  }
  formData.name = ''
  errorMessage.value = ''
  formRef.value?.resetFields()
})

const formRef = ref()
const errorMessage = ref('')
const formData = reactive({
  conid: '',
  name: '',
})

const rules = {
  name: [
    { required: true, message: '请输入数据库名称', trigger: 'blur' },
    { 
      pattern: /^[a-zA-Z0-9_]+$/, 
      message: '数据库名称只能包含字母、数字和下划线', 
      trigger: 'blur' 
    },
    { min: 1, max: 64, message: '数据库名称长度在1-64个字符之间', trigger: 'blur' }
  ],
}

const handleSubmit = async () => {
  try {
    await formRef.value?.validate()
    
    if (!formData.conid) {
      errorMessage.value = '连接ID不能为空'
      return
    }
    
    const result = await serverConnectionsCreateDatabaseApi({
      conid: formData.conid,
      name: formData.name.trim(),
    })
    
    if (result && (result as any).errorMessage) {
      errorMessage.value = (result as any).errorMessage
      createMessage.error('创建数据库失败')
    } else {
      createMessage.success('数据库创建成功！')
      closeModal()
      // 刷新服务器连接以更新数据库列表
      const { serverConnectionsRefreshApi } = await import('/@/api/simpleApis')
      await serverConnectionsRefreshApi({ conid: formData.conid, keepOpen: true })
    }
  } catch (e: any) {
    if (e?.errorFields) {
      // 表单验证错误
      return
    }
    errorMessage.value = e?.message || e?.toString() || '创建数据库失败'
    createMessage.error(errorMessage.value)
  }
}
</script>
