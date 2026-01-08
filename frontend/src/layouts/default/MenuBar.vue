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
  
  <el-dialog
    v-model="aboutDialogVisible"
    title="关于 TinyDB"
    width="500px"
    :show-close="true"
  >
    <div class="about-content">
      <div class="about-header">
        <h2 class="about-title">{{ appInfo.name }}</h2>
        <p class="about-version">版本 {{ appInfo.version }}</p>
      </div>
      <div class="about-body">
        <p class="about-info">
          <strong>作者：</strong>{{ appInfo.author }}
        </p>
        <p class="about-info">
          <strong>邮箱：</strong>
          <a :href="`mailto:${appInfo.email}`" class="about-link">{{ appInfo.email }}</a>
        </p>
        <p class="about-info">
          <strong>项目地址：</strong>
          <a :href="appInfo.url" target="_blank" rel="noopener noreferrer" class="about-link">{{ appInfo.url }}</a>
        </p>
        <p class="about-description">{{ appInfo.description }}</p>
      </div>
    </div>
    <template #footer>
      <el-button type="primary" @click="aboutDialogVisible = false">确定</el-button>
    </template>
  </el-dialog>
</template>

<script lang="ts" setup>
import { reactive, ref, onMounted, onUnmounted } from 'vue'
import runCommand from '/@/second/commands/runCommand'

type MenuChildItem = {
  key: string
  label?: string
  keyText?: string
  onClick?: () => void
  divider?: boolean
  disabled?: boolean
}

type MenuBarMenu = {
  key: string
  label: string
  showDropdown: boolean
  children?: MenuChildItem[]
}

const aboutDialogVisible = ref(false)

const appInfo = {
  name: 'TinyDB',
  version: '0.0.2.2',
  author: 'bob',
  email: 'jycoast@163.com',
  url: 'https://github.com/jycoast/tinydb',
  description: '轻量级数据库管理工具'
}

const menus = reactive<MenuBarMenu[]>([
  {
    key: 'file',
    label: '文件',
    showDropdown: false,
    children: [
      { key: 'new.connection', label: '新建连接', keyText: 'Ctrl+N', onClick: () => runCommand('new.connection') },
      { key: 'open.connection', label: '打开连接' },
      { key: 'file.divider.1', divider: true },
      { key: 'save', label: '保存', keyText: 'Ctrl+S' },
      { key: 'save.as', label: '另存为' },
      { key: 'file.divider.2', divider: true },
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
      { key: 'edit.divider.1', divider: true },
      { key: 'cut', label: '剪切', keyText: 'Ctrl+X' },
      { key: 'copy', label: '复制', keyText: 'Ctrl+C' },
      { key: 'paste', label: '粘贴', keyText: 'Ctrl+V' },
      { key: 'edit.divider.2', divider: true },
      { key: 'find', label: '查找', keyText: 'Ctrl+F' },
      { key: 'replace', label: '替换', keyText: 'Ctrl+H' }
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
      { key: 'tools.divider.1', divider: true },
      { key: 'import', label: '导入数据' },
      { key: 'export', label: '导出数据' }
    ]
  },
  {
    key: 'help',
    label: '帮助',
    showDropdown: false,
    children: [
      { 
        key: 'about', 
        label: '关于',
        onClick: () => {
          aboutDialogVisible.value = true
        }
      }
    ]
  }
])

function handleMenuClick(menu: MenuBarMenu) {
  // 关闭其他菜单
  menus.forEach(m => {
    if (m.key !== menu.key) {
      m.showDropdown = false
    }
  })
  // 切换当前菜单
  menu.showDropdown = !menu.showDropdown
}

function handleItemClick(item: MenuChildItem, menu: MenuBarMenu) {
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

/* 关于对话框样式 */
.about-content {
  padding: 20px 0;
}

.about-header {
  text-align: center;
  margin-bottom: 20px;
}

.about-title {
  margin: 0 0 10px 0;
  font-size: 24px;
  color: #409eff;
}

.about-version {
  margin: 0;
  color: #666;
  font-size: 14px;
}

.about-body {
  line-height: 1.8;
  color: #333;
}

.about-info {
  margin: 10px 0;
}

.about-info strong {
  display: inline-block;
  width: 80px;
}

.about-link {
  color: #409eff;
  text-decoration: none;
}

.about-link:hover {
  text-decoration: underline;
}

.about-description {
  margin: 20px 0 0 0;
  padding-top: 20px;
  border-top: 1px solid #e8e8e8;
  color: #999;
  font-size: 12px;
  text-align: center;
}
</style>

