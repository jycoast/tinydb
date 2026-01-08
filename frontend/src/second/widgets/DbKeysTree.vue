<template>
  <div class="dkt-toolbar">
    <el-space :size="6">
      <el-input
        v-model="filter"
        clearable
        size="small"
        placeholder="Search connection or database"
      />
      <el-tooltip content="Add new key" placement="bottom">
        <el-button size="small" text @click="handleAddKey">
          <el-icon><Plus /></el-icon>
        </el-button>
      </el-tooltip>
      <el-tooltip content="Refresh key list" placement="bottom">
        <el-button size="small" text @click="handleRefreshDatabase">
          <el-icon><Refresh /></el-icon>
        </el-button>
      </el-tooltip>
    </el-space>
  </div>

  <WidgetsInnerContainer>
    DbKeysSubTree component
  </WidgetsInnerContainer>
</template>

<script lang="ts">
import {ref} from 'vue'
import WidgetsInnerContainer from './WidgetsInnerContainer.vue'
import { Plus, Refresh } from '@element-plus/icons-vue'

export default {
  name: 'DbKeysTree',
  components: {
    WidgetsInnerContainer,
  },
  setup() {
    const filter = ref('')

    function handleAddKey() {}

    function handleRefreshDatabase() {}
    return {
      filter,
      handleAddKey,
      handleRefreshDatabase,
      Plus,
      Refresh,
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
