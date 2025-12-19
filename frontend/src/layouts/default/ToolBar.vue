<template>
  <div class="toolbar-root">
    <Space :size="0" class="toolbar-groups">
      <template v-for="(group, idx) in toolbarGroups" :key="group.key">
        <Space :size="4" class="toolbar-group">
          <Tooltip
            v-for="item in group.items"
            :key="item.id"
            :title="item.toolbarName || item.name"
          >
            <Button
              :disabled="item.disabled"
              type="text"
              class="toolbar-btn"
              @click="handleToolbarClick(item)"
            >
              <template #icon>
                <component v-if="getToolbarAntIcon(item)" :is="getToolbarAntIcon(item)" />
                <FontIcon v-else-if="item.icon" :icon="item.icon" />
              </template>
              <span class="toolbar-label">{{ item.toolbarName || item.name }}</span>
            </Button>
          </Tooltip>
        </Space>
        <Divider v-if="idx < toolbarGroups.length - 1" type="vertical" class="toolbar-divider" />
      </template>
    </Space>
  </div>
</template>

<script lang="ts" setup>
import { computed } from 'vue'
import { useBootstrapStore } from '/@/store/modules/bootstrap'
import { storeToRefs } from 'pinia'
import { Button, Divider, Space, Tooltip } from 'ant-design-vue'
import { CodeOutlined, LinkOutlined } from '@ant-design/icons-vue'
import FontIcon from '/@/second/icons/FontIcon.vue'
import runCommand from '/@/second/commands/runCommand'

const bootstrap = useBootstrapStore()
const { commandsCustomized } = storeToRefs(bootstrap)

function getToolbarAntIcon(item: any) {
  // Ensure core actions always have a visible icon even if FontIcon mapping is missing
  switch (item?.id) {
    case 'new.query':
      return CodeOutlined
    case 'new.connection':
      return LinkOutlined
    default:
      return null
  }
}

type ToolbarItem = { id: string; name: string; toolbarName?: string; icon?: string; disabled?: boolean; onClick?: () => void }
type ToolbarGroup = { key: string; items: ToolbarItem[] }

const toolbarGroups = computed<ToolbarGroup[]>(() => {
  const commands = Object.values(commandsCustomized.value || {})
    .filter((cmd: any) => cmd.toolbar)
    .sort((a: any, b: any) => (a.toolbarOrder || 0) - (b.toolbarOrder || 0))

  // 如果没有工具栏命令，返回默认的工具栏项
  if (commands.length === 0) {
    return [
      {
        key: 'connection',
        items: [
          // { id: 'new.connection', name: '连接', icon: 'icon new-connection', toolbarName: '连接' },
          { id: 'new.query', name: '新建查询', icon: 'icon query', toolbarName: '新建查询' }
        ]
      },
      // {
      //   key: 'database',
      //   items: [
      //     { id: 'new.table', name: '表', icon: 'icon table', toolbarName: '表' },
      //     { id: 'new.view', name: '视图', icon: 'icon view', toolbarName: '视图' },
      //     { id: 'new.function', name: '函数', icon: 'icon function', toolbarName: '函数' },
      //     { id: 'new.user', name: '用户', icon: 'icon user', toolbarName: '用户' }
      //   ]
      // },
      // {
      //   key: 'tools',
      //   items: [
      //     { id: 'query', name: '查询', icon: 'icon query', toolbarName: '查询' },
      //     { id: 'backup', name: '备份', icon: 'icon backup', toolbarName: '备份' },
      //     { id: 'auto.run', name: '自动运行', icon: 'icon auto-run', toolbarName: '自动运行' },
      //     { id: 'model', name: '模型', icon: 'icon model', toolbarName: '模型' },
      //     { id: 'bi', name: 'BI', icon: 'icon bi', toolbarName: 'BI' }
      //   ]
      // }
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

  return Object.values(groups) as ToolbarGroup[]
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
.toolbar-root {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  padding: 4px 8px;
  position: relative;
  z-index: 201;
}

.toolbar-groups {
  width: 100%;
  display: flex;
  align-items: center;
  flex-wrap: nowrap;
}

.toolbar-group {
  display: inline-flex;
  align-items: center;
}

.toolbar-divider {
  height: 16px;
  margin: 0 8px;
  border-inline-start-color: var(--theme-border);
}

.toolbar-btn {
  pointer-events: auto;
  padding: 0 6px;
  height: 28px;
  display: inline-flex;
  align-items: center;
}

.toolbar-label {
  white-space: nowrap;
}

.toolbar-icon {
  display: inline-flex;
  align-items: center;
  margin-right: 4px;
  font-size: 14px;
  line-height: 1;
}
</style>


