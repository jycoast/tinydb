<template>
  <a-space :size="8" class="search-box-wrapper">
    <slot></slot>
  </a-space>
</template>

<script lang="ts">
import {defineComponent} from 'vue'
import {Space} from 'ant-design-vue'

export default defineComponent({
  name: 'SearchBoxWrapper',
  components: {
    ASpace: Space
  }
})
</script>

<style scoped>
.search-box-wrapper {
  display: flex;
  border-bottom: 1px solid var(--theme-border);
  margin-bottom: 5px;
  padding-bottom: 5px;
}
</style>
