<template>
  <BasicModal
    @register="register as any"
    @ok="handleSubmit"
    :title="isEditMode ? '编辑连接' : '新建连接'"
    width="520px"
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
      label-position="left"
      label-width="100px"
    >
      <el-form-item label="连接名称" prop="name">
        <el-input
          v-model="formData.name"
          placeholder="用于标识此连接，如：本地开发库"
          :maxlength="64"
          show-word-limit
        />
      </el-form-item>
      <el-form-item label="引擎类型" prop="engine">
        <el-select
          v-model="formData.engine"
          placeholder="请选择数据库类型"
          clearable
          style="width: 100%"
        >
          <el-option value="mysql" label="MySQL" />
        </el-select>
      </el-form-item>
      <el-form-item label="主机地址" prop="host">
        <el-input
          v-model="formData.host"
          placeholder="如：127.0.0.1 或 localhost"
        />
      </el-form-item>
      <el-form-item label="端口" prop="port">
        <el-input-number
          v-model="formData.port"
          :min="1"
          :max="65535"
          placeholder="MySQL 默认 3306"
          style="width: 100%"
        />
      </el-form-item>
      <el-form-item label="用户名" prop="user">
        <el-input
          v-model="formData.user"
          placeholder="数据库登录账号"
        />
      </el-form-item>
      <el-form-item label="密码" prop="password">
        <el-input
          v-model="formData.password"
          type="password"
          :placeholder="isEditMode ? '留空则不修改密码' : '数据库登录密码（可为空）'"
          show-password
          autocomplete="new-password"
        />
      </el-form-item>
    </el-form>
    <template #insertFooter>
      <el-button
        :loading="testing"
        @click="handleTestConnection"
      >
        测试连接
      </el-button>
    </template>
  </BasicModal>
</template>

<script lang="ts" setup>
import { ref, reactive, computed } from "vue"
import { BasicModal, useModalInner } from "/@/components/Modals"
import { connectionSaveApi, connectionTestApi, getConnectionInfo } from "/@/api"
import { useMessage } from "/@/hooks/web/useMessage"
import { useClusterApiStore } from "/@/store/modules/clusterApi"

const { createMessage } = useMessage()
const clusterApi = useClusterApiStore()

const editConnectionRef = ref<any>(null)
const isEditMode = computed(() => !!editConnectionRef.value?._id)

const [register, { closeModal }] = useModalInner(async (data?: any) => {
  errorMessage.value = ""
  if (!data || !data._id) {
    editConnectionRef.value = null
    formData.name = ""
    formData.engine = undefined
    formData.host = ""
    formData.port = 3306
    formData.user = ""
    formData.password = ""
    formRef.value?.resetFields()
    return
  }
  const conn = (await getConnectionInfo({ conid: data._id })) as any
  const c = conn || data
  editConnectionRef.value = c
  formData.name = c.name || ""
  formData.engine = c.engine || "mysql"
  formData.host = c.host || c.server || ""
  formData.port = c.port ? Number(c.port) : 3306
  formData.user = c.user || c.username || ""
  formData.password = ""
  formRef.value?.clearValidate()
})

const formRef = ref()
const errorMessage = ref("")
const testing = ref(false)
const formData = reactive({
  name: "",
  engine: undefined as string | undefined,
  host: "",
  port: 3306,
  user: "",
  password: "",
})

const rules = {
  name: [
    { required: true, message: "请输入连接名称", trigger: "blur" },
    { min: 1, max: 64, message: "连接名称长度在1-64个字符之间", trigger: "blur" },
  ],
  engine: [{ required: true, message: "请选择数据库类型", trigger: "change" }],
  host: [{ required: true, message: "请输入主机地址", trigger: "blur" }],
  port: [{ required: true, message: "请输入端口", trigger: "blur" }],
  user: [{ required: true, message: "请输入用户名", trigger: "blur" }],
}

function buildConnectionParams() {
  const editConn = editConnectionRef.value
  const password = formData.password || (editConn?.password ?? "")
  return {
    _id: editConn?._id || "",
    name: formData.name.trim(),
    engine: formData.engine,
    host: formData.host.trim(),
    port: String(formData.port || 3306),
    user: formData.user.trim(),
    password,
  }
}

async function handleTestConnection() {
  try {
    await formRef.value?.validate()
    if (!formData.host?.trim()) {
      errorMessage.value = "请输入主机地址"
      return
    }
    if (!formData.user?.trim()) {
      errorMessage.value = "请输入用户名"
      return
    }
    if (!formData.engine) {
      errorMessage.value = "请选择数据库类型"
      return
    }
    testing.value = true
    errorMessage.value = ""
    const params = buildConnectionParams()
    const resp = await connectionTestApi(params) as any
    if (resp?.errorMessage) {
      errorMessage.value = resp.errorMessage
      createMessage.error("连接测试失败")
    } else {
      createMessage.success("连接测试成功")
    }
  } catch (e: any) {
    if (e?.message) return
    errorMessage.value = e?.message || e?.toString() || "测试失败"
    createMessage.error(errorMessage.value)
  } finally {
    testing.value = false
  }
}

async function handleSubmit() {
  try {
    await formRef.value?.validate()
    if (!formData.name?.trim()) {
      errorMessage.value = "请输入连接名称"
      return
    }
    if (!formData.engine) {
      errorMessage.value = "请选择数据库类型"
      return
    }
    if (!formData.host?.trim()) {
      errorMessage.value = "请输入主机地址"
      return
    }
    if (!formData.user?.trim()) {
      errorMessage.value = "请输入用户名"
      return
    }
    await connectionSaveApi(buildConnectionParams() as any)
    createMessage.success(isEditMode.value ? "连接已更新" : "连接保存成功")
    closeModal()
    clusterApi.setConnectionList(await import("/@/api").then((m) => m.connectionListApi()))
  } catch (e: any) {
    if (e?.message) return
    errorMessage.value = e?.message || e?.toString() || "保存失败"
    createMessage.error(errorMessage.value)
  }
}
</script>
