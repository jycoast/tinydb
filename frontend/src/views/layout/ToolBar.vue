<template>
  <div class="toolbar-root">
    <el-space :size="0" class="toolbar-groups">
      <template v-for="(group, idx) in toolbarGroups" :key="group.key">
        <el-space :size="4" class="toolbar-group">
          <el-tooltip
            v-for="item in group.items"
            :key="item.id"
            :content="item.toolbarName || item.name"
            placement="bottom"
          >
            <el-button
              :disabled="item.disabled"
              text
              @click="handleToolbarClick(item)"
            >
              <template #icon>
                <component v-if="getToolbarElIcon(item)" :is="getToolbarElIcon(item)" />
                <AppIcon v-else-if="item.icon" :icon="item.icon" />
              </template>
              <span class="toolbar-label">{{ item.toolbarName || item.name }}</span>
            </el-button>
          </el-tooltip>
        </el-space>
        <el-divider v-if="idx < toolbarGroups.length - 1" direction="vertical" class="toolbar-divider" />
      </template>
    </el-space>
  </div>
</template>

<script lang="ts" setup>
import { computed } from 'vue'
import { useBootstrapStore } from '/@/store/modules/bootstrap'
import { storeToRefs } from 'pinia'
import { Document, Link, Clock } from '@element-plus/icons-vue'
import AppIcon from '/@/components/Icon/src/AppIcon.vue'
import {runCommand} from "/@/commands"

const bootstrap = useBootstrapStore()
const { commandsCustomized } = storeToRefs(bootstrap)

function getToolbarElIcon(item: any) {
  // Ensure core actions always have a visible icon even if AppIcon mapping is missing
  switch (item?.id) {
    case 'new.query':
      return Document
    case 'new.connection':
      return Link
    case 'query.history':
      return Clock
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
          { id: 'new.query', name: '新建查询', icon: 'icon query', toolbarName: '新建查询' },
          { id: 'query.history', name: '查询历史', icon: 'icon history', toolbarName: '查询历史' }
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
  /* 工具栏容器本身可拖动，但内部按钮不可拖动 */
  -webkit-app-region: drag;
  --wails-draggable: drag;
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
  /* 分隔符不可拖动 */
  -webkit-app-region: no-drag;
  --wails-draggable: no-drag;
}

.toolbar-btn {
  pointer-events: auto;
  padding: 0 6px;
  height: 28px;
  display: inline-flex;
  align-items: center;
  /* 按钮区域不可拖动，以便点击 */
  -webkit-app-region: no-drag;
  --wails-draggable: no-drag;
}

.toolbar-label {
  white-space: nowrap;
}

</style>
