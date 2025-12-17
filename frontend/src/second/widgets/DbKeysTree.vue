<template>
  <div class="dkt-toolbar">
    <ASpace :size="6">
      <AInput
        v-model:value="filter"
        allowClear
        size="small"
        placeholder="Search connection or database"
      />
      <ATooltip title="Add new key">
        <AButton size="small" type="text" @click="handleAddKey">
          <template #icon><PlusOutlined /></template>
        </AButton>
      </ATooltip>
      <ATooltip title="Refresh key list">
        <AButton size="small" type="text" @click="handleRefreshDatabase">
          <template #icon><ReloadOutlined /></template>
        </AButton>
      </ATooltip>
    </ASpace>
  </div>

  <WidgetsInnerContainer>
    DbKeysSubTree component
  </WidgetsInnerContainer>
</template>

<script lang="ts">
import {ref} from 'vue'
import WidgetsInnerContainer from './WidgetsInnerContainer.vue'

import {Button, Input, Space, Tooltip} from 'ant-design-vue'
import {PlusOutlined, ReloadOutlined} from '@ant-design/icons-vue'
export default {
  name: 'DbKeysTree',
  components: {
    WidgetsInnerContainer,
    [Button.name]: Button,
    [Input.name]: Input,
    [Space.name]: Space,
    [Tooltip.name]: Tooltip,
    PlusOutlined,
    ReloadOutlined,
  },
  setup() {
    const filter = ref('')

    function handleAddKey() {}

    function handleRefreshDatabase() {}
    return {
      filter,
      handleAddKey,
      handleRefreshDatabase
    }
  }
}
</script>

<style scoped>
.dkt-toolbar {
  display: flex;
  align-items: center;
  padding: 6px 6px 8px;
  border-bottom: 1px solid var(--theme-border);
}
</style>
