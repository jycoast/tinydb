<template>
  <BasicModal
    @register="handleRegister"
    @ok="handleSubmit"
    title="创建数据库"
    width="500px"
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
      label-width="120px"
    >
      <el-form-item label="数据库名称" prop="name">
        <el-input
          v-model="formData.name"
          placeholder="请输入数据库名称"
          :maxlength="64"
          show-word-limit
        />
      </el-form-item>
    </el-form>
  </BasicModal>
</template>

<script lang="ts" setup>
import {ref, reactive} from "vue"
import {BasicModal, useModalInner} from "/@/components/Modals"
import {serverConnectionsCreateDatabaseApi} from "/@/api"
import {useMessage} from "/@/hooks/web/useMessage"
import {useBootstrapStore} from "/@/store/modules/bootstrap"

const emit = defineEmits(["register"])
const {createMessage} = useMessage()
const bootstrap = useBootstrapStore()

const [register, {closeModal}] = useModalInner((data) => {
  if (data?.conid) formData.conid = data.conid
  formData.name = ""
  errorMessage.value = ""
  formRef.value?.resetFields()
})
function handleRegister(m: any, u: string) {
  register(m, u)
  emit('register', m, u)
}

const formRef = ref()
const errorMessage = ref("")
const formData = reactive({
  conid: "",
  name: "",
})

const rules = {
  name: [
    {required: true, message: "请输入数据库名称", trigger: "blur"},
    {pattern: /^[a-zA-Z0-9_]+$/, message: "数据库名称只能包含字母、数字和下划线", trigger: "blur"},
    {min: 1, max: 64, message: "数据库名称长度在1-64个字符之间", trigger: "blur"},
  ],
}

async function handleSubmit() {
  try {
    await formRef.value?.validate()
    if (!formData.conid) {
      errorMessage.value = "连接ID不能为空"
      return
    }
    const result = await serverConnectionsCreateDatabaseApi({
      conid: formData.conid,
      name: formData.name.trim(),
    })
    if (result && (result as any).errorMessage) {
      errorMessage.value = (result as any).errorMessage
      createMessage.error("创建数据库失败")
    } else {
      createMessage.success("数据库创建成功！")
      closeModal()
      const {serverConnectionsRefreshApi} = await import("/@/api")
      await serverConnectionsRefreshApi({conid: formData.conid})
    }
  } catch (e: any) {
    if (e?.message) return
    errorMessage.value = e?.message || e?.toString() || "创建数据库失败"
    createMessage.error(errorMessage.value)
  }
}
</script>
