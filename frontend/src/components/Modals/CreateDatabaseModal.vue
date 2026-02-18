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
      
      <el-form-item label="字符集" prop="charset">
        <el-select
          v-model="formData.charset"
          placeholder="请选择字符集"
          clearable
          filterable
          style="width: 100%"
        >
          <el-option
            v-for="charset in charsetOptions"
            :key="charset.value"
            :label="charset.label"
            :value="charset.value"
          />
        </el-select>
      </el-form-item>
      
      <el-form-item label="排序规则" prop="collation">
        <el-select
          v-model="formData.collation"
          placeholder="请选择排序规则"
          clearable
          filterable
          style="width: 100%"
        >
          <el-option
            v-for="collation in collationOptions"
            :key="collation.value"
            :label="collation.label"
            :value="collation.value"
          />
        </el-select>
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
  formData.charset = ""
  formData.collation = ""
  errorMessage.value = ""
  formRef.value?.resetFields()
})
function handleRegister(m: any, u: string) {
  register(m, u)
  emit('register', m, u)
}

const formRef = ref()
const errorMessage = ref("")

// 字符集选项
const charsetOptions = [
  { label: 'utf8mb4', value: 'utf8mb4' },
  { label: 'utf8', value: 'utf8' },
  { label: 'latin1', value: 'latin1' },
  { label: 'gbk', value: 'gbk' },
  { label: 'gb2312', value: 'gb2312' },
  { label: 'ascii', value: 'ascii' },
  { label: 'big5', value: 'big5' },
  { label: 'binary', value: 'binary' },
  { label: 'cp1250', value: 'cp1250' },
  { label: 'cp1251', value: 'cp1251' },
  { label: 'cp1256', value: 'cp1256' },
  { label: 'cp1257', value: 'cp1257' },
  { label: 'cp850', value: 'cp850' },
  { label: 'cp852', value: 'cp852' },
  { label: 'cp866', value: 'cp866' },
  { label: 'cp932', value: 'cp932' },
  { label: 'dec8', value: 'dec8' },
  { label: 'eucjpms', value: 'eucjpms' },
  { label: 'euckr', value: 'euckr' },
  { label: 'gb18030', value: 'gb18030' },
  { label: 'geostd8', value: 'geostd8' },
  { label: 'greek', value: 'greek' },
  { label: 'hebrew', value: 'hebrew' },
  { label: 'hp8', value: 'hp8' },
  { label: 'keybcs2', value: 'keybcs2' },
  { label: 'koi8r', value: 'koi8r' },
  { label: 'koi8u', value: 'koi8u' },
  { label: 'latin2', value: 'latin2' },
  { label: 'latin5', value: 'latin5' },
  { label: 'latin7', value: 'latin7' },
  { label: 'macce', value: 'macce' },
  { label: 'macroman', value: 'macroman' },
  { label: 'sjis', value: 'sjis' },
  { label: 'swe7', value: 'swe7' },
  { label: 'tis620', value: 'tis620' },
  { label: 'ucs2', value: 'ucs2' },
  { label: 'ujis', value: 'ujis' },
  { label: 'utf16', value: 'utf16' },
  { label: 'utf16le', value: 'utf16le' },
  { label: 'utf32', value: 'utf32' },
]

// 排序规则选项
const collationOptions = [
  { label: 'utf8mb4_general_ci', value: 'utf8mb4_general_ci' },
  { label: 'utf8mb4_unicode_ci', value: 'utf8mb4_unicode_ci' },
  { label: 'utf8mb4_bin', value: 'utf8mb4_bin' },
  { label: 'utf8_general_ci', value: 'utf8_general_ci' },
  { label: 'utf8_unicode_ci', value: 'utf8_unicode_ci' },
  { label: 'utf8_bin', value: 'utf8_bin' },
  { label: 'latin1_swedish_ci', value: 'latin1_swedish_ci' },
  { label: 'latin1_general_ci', value: 'latin1_general_ci' },
  { label: 'latin1_bin', value: 'latin1_bin' },
  { label: 'gbk_chinese_ci', value: 'gbk_chinese_ci' },
  { label: 'gbk_bin', value: 'gbk_bin' },
  { label: 'gb2312_chinese_ci', value: 'gb2312_chinese_ci' },
  { label: 'gb2312_bin', value: 'gb2312_bin' },
  { label: 'ascii_general_ci', value: 'ascii_general_ci' },
  { label: 'ascii_bin', value: 'ascii_bin' },
  { label: 'big5_chinese_ci', value: 'big5_chinese_ci' },
  { label: 'big5_bin', value: 'big5_bin' },
  { label: 'binary', value: 'binary' },
]
const formData = reactive({
  conid: "",
  name: "",
  charset: "",
  collation: "",
})

const rules = {
  name: [
    {required: true, message: "请输入数据库名称", trigger: "blur"},
    {pattern: /^[a-zA-Z0-9_]+$/, message: "数据库名称只能包含字母、数字和下划线", trigger: "blur"},
    {min: 1, max: 64, message: "数据库名称长度在1-64个字符之间", trigger: "blur"},
  ],
  charset: [
    {required: false, message: "请选择字符集", trigger: "change"}
  ],
  collation: [
    {required: false, message: "请选择排序规则", trigger: "change"}
  ]
}

async function handleSubmit() {
  try {
    await formRef.value?.validate()
    if (!formData.conid) {
      errorMessage.value = "连接ID不能为空"
      return
    }
    const requestData: any = {
      conid: formData.conid,
      name: formData.name.trim(),
    }
    
    if (formData.charset) {
      requestData.charset = formData.charset
    }
    
    if (formData.collation) {
      requestData.collation = formData.collation
    }
    
    const result = await serverConnectionsCreateDatabaseApi(requestData)
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
