<template>
  <div class="menu-bar-container">
    <div class="menu-item" v-for="menu in menus" :key="menu.key">
      <span class="menu-label" @click="handleMenuClick(menu)">{{ menu.label }}</span>
      <div v-if="menu.showDropdown && menu.children" class="menu-dropdown" @click.stop>
        <div 
          v-for="item in menu.children" 
          :key="item.key"
          class="menu-dropdown-item"
          :class="{ disabled: item.disabled, divider: item.divider }"
          @click="handleItemClick(item, menu)"
        >
          <span v-if="!item.divider" class="menu-item-label">{{ item.label }}</span>
          <span v-if="item.keyText" class="menu-item-shortcut">{{ item.keyText }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { reactive, onMounted, onUnmounted } from 'vue'
import runCommand from '/@/second/commands/runCommand'
import { useBootstrapStore } from '/@/store/modules/bootstrap'
import { storeToRefs } from 'pinia'

const bootstrap = useBootstrapStore()
const { commandsCustomized } = storeToRefs(bootstrap)

const menus = reactive([
  {
    key: 'file',
    label: '文件',
    showDropdown: false,
    children: [
      { key: 'new.connection', label: '新建连接', keyText: 'Ctrl+N', onClick: () => runCommand('new.connection') },
      { key: 'open.connection', label: '打开连接' },
      { divider: true },
      { key: 'save', label: '保存', keyText: 'Ctrl+S' },
      { key: 'save.as', label: '另存为' },
      { divider: true },
      { key: 'exit', label: '退出' }
    ]
  },
  {
    key: 'edit',
    label: '编辑',
    showDropdown: false,
    children: [
      { key: 'undo', label: '撤销', keyText: 'Ctrl+Z' },
      { key: 'redo', label: '重做', keyText: 'Ctrl+Y' },
      { divider: true },
      { key: 'cut', label: '剪切', keyText: 'Ctrl+X' },
      { key: 'copy', label: '复制', keyText: 'Ctrl+C' },
      { key: 'paste', label: '粘贴', keyText: 'Ctrl+V' },
      { divider: true },
      { key: 'find', label: '查找', keyText: 'Ctrl+F' },
      { key: 'replace', label: '替换', keyText: 'Ctrl+H' }
    ]
  },
  {
    key: 'view',
    label: '查看',
    showDropdown: false,
    children: [
      { key: 'refresh', label: '刷新', keyText: 'F5' },
      { key: 'fullscreen', label: '全屏', keyText: 'F11' },
      { divider: true },
      { key: 'show.left.panel', label: '显示左侧面板' },
      { key: 'show.statusbar', label: '显示状态栏' }
    ]
  },
  {
    key: 'tools',
    label: '工具',
    showDropdown: false,
    children: [
      { key: 'options', label: '选项' },
      { key: 'backup', label: '备份' },
      { key: 'restore', label: '恢复' },
      { divider: true },
      { key: 'import', label: '导入数据' },
      { key: 'export', label: '导出数据' }
    ]
  },
  {
    key: 'help',
    label: '帮助',
    showDropdown: false,
    children: [
      { key: 'documentation', label: '文档' },
      { key: 'about', label: '关于' }
    ]
  }
])

function handleMenuClick(menu: any) {
  // 关闭其他菜单
  menus.forEach(m => {
    if (m.key !== menu.key) {
      m.showDropdown = false
    }
  })
  // 切换当前菜单
  menu.showDropdown = !menu.showDropdown
}

function handleItemClick(item: any, menu: any) {
  if (item.disabled || item.divider) return
  
  menu.showDropdown = false
  
  if (item.onClick) {
    item.onClick()
  } else if (item.key) {
    runCommand(item.key)
  }
}

// 点击外部关闭菜单
let clickOutsideHandler: ((event: MouseEvent) => void) | null = null

onMounted(() => {
  clickOutsideHandler = (event: MouseEvent) => {
    const target = event.target as HTMLElement
    if (!target.closest('.menu-item')) {
      menus.forEach(menu => {
        menu.showDropdown = false
      })
    }
  }
  document.addEventListener('click', clickOutsideHandler)
})

onUnmounted(() => {
  if (clickOutsideHandler) {
    document.removeEventListener('click', clickOutsideHandler)
  }
})
</script>

<style scoped>
.menu-bar-container {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  padding: 0;
  position: relative;
  z-index: 300;
  background: #ffffff; /* 白色背景，与系统主题一致 */
  border-bottom: 1px solid #d9d9d9;
}

.menu-item {
  position: relative;
  padding: 0;
  display: flex;
  align-items: center;
  cursor: pointer;
  user-select: none;
  height: 100%;
}

.menu-label {
  font-size: 13px;
  color: #1f1f1f; /* 深色文字，适配白色背景 */
  padding: 4px 12px;
  border-radius: 0;
  height: 100%;
  display: flex;
  align-items: center;
  transition: background-color 0.2s;
}

.menu-item:hover .menu-label {
  background: #f5f5f5; /* 悬停时的浅灰色背景 */
}

.menu-item:active .menu-label {
  background: #e8e8e8; /* 点击时的稍深背景 */
}

.menu-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  min-width: 200px;
  background: #ffffff; /* 下拉菜单使用白色背景 */
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 10000; /* 确保下拉菜单在最上层，覆盖工具栏 */
  margin-top: 0;
  padding: 4px 0;
}

.menu-dropdown-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 16px;
  font-size: 13px;
  color: #1f1f1f; /* 深色文字 */
  cursor: pointer;
  white-space: nowrap;
  transition: background-color 0.2s;
}

.menu-dropdown-item:hover:not(.disabled):not(.divider) {
  background: #f5f5f5; /* 悬停时的浅灰色背景 */
}

.menu-dropdown-item.disabled {
  color: #a8a8a8;
  cursor: not-allowed;
}

.menu-dropdown-item.divider {
  height: 1px;
  padding: 0;
  margin: 4px 8px;
  background: #e8e8e8;
  cursor: default;
}

.menu-item-label {
  flex: 1;
}

.menu-item-shortcut {
  margin-left: 24px;
  color: #787878;
  font-size: 12px;
}
</style>

