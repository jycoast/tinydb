<template>
  <div style="width: 100%; height: 100%; display: flex; align-items: center; padding: 4px 8px; position: relative; z-index: 201;">
    <Space :size="0" style="width: 100%;">
      <Space v-for="group in toolbarGroups" :key="group.key" :size="0" style="border-right: 1px solid var(--theme-border); padding-right: 8px; margin-right: 8px;">
        <Button
          v-for="item in group.items"
          :key="item.id"
          :disabled="item.disabled"
          :title="item.toolbarName || item.name"
          type="text"
          style="pointer-events: auto;"
          @click="handleToolbarClick(item)"
        >
          <template v-if="item.icon">
            <FontIcon :icon="item.icon" style="margin-right: 4px;" />
          </template>
          {{ item.toolbarName || item.name }}
        </Button>
      </Space>
    </Space>
  </div>
</template>

<script lang="ts" setup>
import { computed } from 'vue'
import { useBootstrapStore } from '/@/store/modules/bootstrap'
import { storeToRefs } from 'pinia'
import { Button, Space } from 'ant-design-vue'
import FontIcon from '/@/second/icons/FontIcon.vue'
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


