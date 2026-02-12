<template>
  <QueryHistory />
</template>

<script lang="ts">
// 给 openNewTab 用：用于判断是否复用已有 tab
export const matchingProps: string[] = []
export const allowAddToFavorites = (_: any) => false
</script>

<script lang="ts" setup>
import { PropType } from 'vue'
import { QueryHistory } from '/@/views'

defineProps({
  tabid: { type: String as PropType<string>, required: true },
  tabVisible: { type: Boolean as PropType<boolean>, default: true },
})
</script>

<style scoped>
/* 样式由 QueryHistory 组件提供 */
</style>
