<template>
  <div class="toolbar">
    <div class="toolbar-group" v-for="group in toolbarGroups" :key="group.key">
      <ToolbarButton
        v-for="item in group.items"
        :key="item.id"
        :icon="item.icon"
        :title="item.toolbarName || item.name"
        :disabled="item.disabled"
        @click="handleToolbarClick(item)"
      >
        {{ item.toolbarName || item.name }}
      </ToolbarButton>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed } from 'vue'
import { useBootstrapStore } from '/@/store/modules/bootstrap'
import { storeToRefs } from 'pinia'
import ToolbarButton from '/@/second/buttons/ToolbarButton.vue'
import runCommand from '/@/second/commands/runCommand'

const bootstrap = useBootstrapStore()
const { commandsCustomized } = storeToRefs(bootstrap)

const toolbarGroups = computed(() => {
  const commands = Object.values(commandsCustomized.value || {})
    .filter((cmd: any) => cmd.toolbar)
    .sort((a: any, b: any) => (a.toolbarOrder || 0) - (b.toolbarOrder || 0))

  // 如果没有工具栏命令，返回默认的工具栏项
  if (commands.length === 0) {
    return [
      {
        key: 'connection',
        items: [
          { id: 'new.connection', name: '连接', icon: 'icon new-connection', toolbarName: '连接' },
          { id: 'new.query', name: '新建查询', icon: 'icon query', toolbarName: '新建查询' }
        ]
      },
      {
        key: 'database',
        items: [
          { id: 'new.table', name: '表', icon: 'icon table', toolbarName: '表' },
          { id: 'new.view', name: '视图', icon: 'icon view', toolbarName: '视图' },
          { id: 'new.function', name: '函数', icon: 'icon function', toolbarName: '函数' },
          { id: 'new.user', name: '用户', icon: 'icon user', toolbarName: '用户' }
        ]
      },
      {
        key: 'tools',
        items: [
          { id: 'query', name: '查询', icon: 'icon query', toolbarName: '查询' },
          { id: 'backup', name: '备份', icon: 'icon backup', toolbarName: '备份' },
          { id: 'auto.run', name: '自动运行', icon: 'icon auto-run', toolbarName: '自动运行' },
          { id: 'model', name: '模型', icon: 'icon model', toolbarName: '模型' },
          { id: 'bi', name: 'BI', icon: 'icon bi', toolbarName: 'BI' }
        ]
      }
    ]
  }

  // 按 category 分组
  const groups: any = {}
  commands.forEach((cmd: any) => {
    const category = cmd.category || 'other'
    if (!groups[category]) {
      groups[category] = { key: category, items: [] }
    }
    groups[category].items.push(cmd)
  })

  return Object.values(groups)
})

function handleToolbarClick(item: any) {
  if (item.disabled) return
  if (item.onClick) {
    item.onClick()
  } else if (item.id) {
    runCommand(item.id)
  }
}
</script>

<style scoped>
.toolbar {
  display: flex;
  height: 100%;
  background: var(--theme-bg-1);
  border-bottom: 1px solid var(--theme-border);
  align-items: center;
  overflow-x: auto;
  overflow-y: hidden;
}

.toolbar-group {
  display: flex;
  align-items: center;
  border-right: 1px solid var(--theme-border);
  padding-right: 4px;
  margin-right: 4px;
}

.toolbar-group:last-child {
  border-right: none;
  margin-right: 0;
}

/* 滚动条样式 */
.toolbar::-webkit-scrollbar {
  height: 4px;
}

.toolbar::-webkit-scrollbar-track {
  background: var(--theme-bg-1);
}

.toolbar::-webkit-scrollbar-thumb {
  background: var(--theme-border);
  border-radius: 2px;
}

.toolbar::-webkit-scrollbar-thumb:hover {
  background: var(--theme-font-3);
}
</style>

