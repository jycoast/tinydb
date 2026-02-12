<template>
  <BasicModal
    @register="register"
    @ok="handleSubmit"
    title="新建连接"
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
      :label-position="'left'"
      label-width="100px"
    >
      <el-form-item label="连接名称" prop="name">
        <el-input
          v-model="formData.name"
          placeholder="请输入连接名称"
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
    </el-form>
  </BasicModal>
</template>

<script lang="ts" setup>
import {ref, reactive} from "vue"
import {BasicModal, useModalInner} from "/@/components/Modals"
import {connectionSaveApi} from "/@/api"
import {useMessage} from "/@/hooks/web/useMessage"
import {useClusterApiStore} from "/@/store/modules/clusterApi"

const {createMessage} = useMessage()
const clusterApi = useClusterApiStore()

const [register, {closeModal}] = useModalInner(() => {
  formData.name = ""
  formData.engine = undefined
  errorMessage.value = ""
  formRef.value?.resetFields()
})

const formRef = ref()
const errorMessage = ref("")
const formData = reactive<{name: string; engine?: string}>({
  name: "",
  engine: undefined,
})

const rules = {
  name: [
    {required: true, message: "请输入连接名称", trigger: "blur"},
    {min: 1, max: 64, message: "连接名称长度在1-64个字符之间", trigger: "blur"},
  ],
  engine: [{required: true, message: "请选择数据库类型", trigger: "change"}],
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
    await connectionSaveApi({
      _id: "",
      name: formData.name.trim(),
      engine: formData.engine,
    } as any)
    createMessage.success("连接保存成功")
    closeModal()
    clusterApi.setConnectionList(await import("/@/api").then((m) => m.connectionListApi()))
  } catch (e: any) {
    if (e?.message) return
    errorMessage.value = e?.message || e?.toString() || "保存失败"
    createMessage.error(errorMessage.value)
  }
}
</script>
