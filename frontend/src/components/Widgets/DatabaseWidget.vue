<template>
  <div v-show="!hidden" class="dbw-root">
    <DatabaseOverview/>
  </div>
</template>

<script setup lang="ts">
import DatabaseOverview from "/@/views/Database/DatabaseOverview.vue"

defineProps<{
  hidden?: boolean
}>()
</script>

<style scoped>
.dbw-root {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  background: var(--theme-bg-0);
  overflow: hidden;
}
</style>
