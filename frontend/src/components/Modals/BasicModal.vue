<template>
  <el-dialog
    v-model="visibleRef"
    :title="mergedProps.title"
    :width="mergedProps.width || '520px'"
    :close-on-click-modal="mergedProps.maskClosable !== false"
    :destroy-on-close="mergedProps.destroyOnClose"
    append-to-body
    @close="handleClose"
  >
    <template #header v-if="$slots.header">
      <slot name="header" />
    </template>
    <div v-loading="mergedProps.loading" :element-loading-text="mergedProps.loadingTip">
      <slot />
    </div>
    <template #footer v-if="showFooter">
      <slot name="footer">
        <slot name="insertFooter" />
        <el-button v-if="mergedProps.showCancelBtn !== false" v-bind="mergedProps.cancelButtonProps" @click="handleClose">取消</el-button>
        <slot name="centerFooter" />
        <el-button
          type="primary"
          :loading="mergedProps.confirmLoading"
          v-bind="mergedProps.okButtonProps"
          @click="handleOk"
        >
          {{ mergedProps.okText || '确定' }}
        </el-button>
        <slot name="appendFooter" />
      </slot>
    </template>
  </el-dialog>
</template>

<script lang="ts" setup>
import {ref, computed, watch, getCurrentInstance} from "vue"
import {deepMerge} from "/@/utils"
import {createModalContext} from "./useModalContext"
import type {ModalProps, ModalMethods} from "./typing"

const props = withDefaults(
  defineProps<{
    title?: string
    width?: string | number
    okText?: string
    cancelText?: string
    showOkBtn?: boolean
    showCancelBtn?: boolean
    loading?: boolean
    loadingTip?: string
    confirmLoading?: boolean
    destroyOnClose?: boolean
    maskClosable?: boolean
    closeFunc?: () => Promise<boolean>
    okButtonProps?: Record<string, any>
    cancelButtonProps?: Record<string, any>
  }>(),
  {
    showOkBtn: true,
    showCancelBtn: true,
    maskClosable: true,
  }
)

const emit = defineEmits<{
  (e: "register", methods: ModalMethods, uid: number): void
  (e: "ok"): void
  (e: "cancel"): void
  (e: "visible-change", v: boolean): void
}>()

const visibleRef = ref(false)
const propsRef = ref<Partial<ModalProps> | null>(null)

const mergedProps = computed(() => ({
  ...props,
  ...(propsRef.value || {}),
}))

const showFooter = computed(() => {
  if (propsRef.value?.footer !== undefined) return !!propsRef.value.footer
  return props.showOkBtn || props.showCancelBtn
})

function setModalProps(p: Partial<ModalProps>) {
  propsRef.value = deepMerge(propsRef.value || {}, p)
  if (Reflect.has(p, "visible")) {
    visibleRef.value = !!p.visible
  }
}

const modalMethods: ModalMethods = {
  setModalProps,
  emitVisible: undefined,
  redoModalHeight: () => {},
}

createModalContext({redoModalHeight: () => {}})

const instance = getCurrentInstance()
if (instance) {
  emit("register", modalMethods, String(instance.uid))
}

watch(visibleRef, (v) => {
  emit("visible-change", v)
  modalMethods.emitVisible?.(v, instance?.uid as number)
})

async function handleClose() {
  const fn = mergedProps.value.closeFunc
  if (fn && typeof fn === "function") {
    const close = await fn()
    if (!close) return
  }
  visibleRef.value = false
  emit("cancel")
}

function handleOk() {
  emit("ok")
}
</script>
