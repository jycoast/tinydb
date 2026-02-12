<template>
  <div class="not-supported">
    <div class="m-5 big-icon">
      <el-icon :size="20"><Warning /></el-icon>
    </div>
    <div class="m-3">Sorry, tinydb is not supported on mobile devices.</div>
    <div class="m-3">Please visit <a href="https://github.com/jycoast/tinydb">tinydb</a> for more
      info.
    </div>
  </div>
  <el-container class="root tinydb-screen" style="height: 100%; width: 100%; overflow: hidden;">
    <!-- 自定义标题栏（Frameless window）：集成 MenuBar -->
    <TitleBar/>

    <!-- 工具栏 -->
    <el-header class="toolbar-header" style="height: var(--dim-toolbar-height); line-height: var(--dim-toolbar-height); padding: 0; position: relative; z-index: 200; background: #ffffff; border-bottom: 1px solid #d9d9d9;">
      <ToolBar/>
    </el-header>

    <!-- 主体内容 -->
    <el-container style="flex: 1; min-height: 0;">
      <!-- 左侧面板：固定显示 DatabaseWidget（去掉左侧图标栏/模块切换栏） -->
      <el-aside
        :width="`${leftPanelWidthPx}px`"
        style="overflow: hidden;"
      >
        <div style="height: 100%; display: flex; flex-direction: column; overflow: auto;">
          <WidgetContainer/>
        </div>
      </el-aside>
      <!-- 分割条 -->
      <div
        class="splitter"
        v-splitterDrag="'clientX'"
        :resizeSplitter="(e) => localeStore.updateLeftPanelWidth(x => x + e.detail)"
      />

      <!-- 主内容区 -->
      <el-container style="flex: 1; min-width: 0; min-height: 0; display: flex; flex-direction: column;">
        <!-- 标签页栏 -->
        <div style="flex: 0 0 var(--dim-tabs-panel-height); height: var(--dim-tabs-panel-height); overflow: hidden;">
          <TabsPanel/>
        </div>
        <!-- 标签页内容 -->
        <el-main style="flex: 1; min-height: 0; position: relative; overflow: hidden; padding: 0;">
          <TabRegister/>
        </el-main>
      </el-container>
    </el-container>

    <!-- 底部状态栏 -->
    <el-footer style="height: var(--dim-statusbar-height); padding: 0; position: relative; z-index: 200; display: flex; align-items: stretch; overflow: visible;">
      <StatusBar/>
    </el-footer>

    <!-- 通知容器 -->
    <div class="snackbar-container"></div>

    <NewConnectionModal @register="registerNewConnectionModal" />
  </el-container>
</template>

<script lang="ts" setup>
import {computed, onMounted, onBeforeUnmount, ref, watch} from 'vue'
import {storeToRefs} from 'pinia'
import {debounce} from 'lodash-es'
import {useLocaleStore} from '/@/store/modules/locale'
import {subscribeRecentDatabaseSwitch, subscribeCurrentDbByTab} from "/@/api"
import WidgetContainer from '/@/components/Widgets/WidgetContainer.vue'
import TabsPanel from '/@/components/Widgets/TabsPanel.vue'
import TabRegister from './TabRegister.vue'
import StatusBar from '/@/components/Widgets/StatusBar.vue'
import { Warning } from '@element-plus/icons-vue'
import ToolBar from './ToolBar.vue'
import TitleBar from './TitleBar.vue'
import bus from '/@/utils/tinydb/bus'
import { useModal } from "/@/components/Modals"
import NewConnectionModal from '/@/views/Connections/NewConnectionModal.vue'

const [registerNewConnectionModal, { openModal: openNewConnectionModal }] = useModal()

const excludeFirst = ref(false)
const localeStore = useLocaleStore()
const {selectedWidget, leftPanelWidth, visibleTitleBar} = storeToRefs(localeStore)
const leftPanelWidthPx = computed(() => Math.max(24, Number(leftPanelWidth.value || 280)))

window.addEventListener('resize', debounce(() => {
  if (excludeFirst.value) {
    bus.emitter.emit(bus.resize)
  }
}, 300))

onMounted(() => (excludeFirst.value = true))

// Remove the left iconbar area: collapse its reserved width in CSS vars
onMounted(() => {
  localeStore.setCssVariable(0, (x) => `${x}px`, '--dim-widget-icon-size')
  if (!selectedWidget.value) {
    localeStore.setSelectedWidget('database')
  }
  window.addEventListener('open-new-connection-modal', handleOpenNewConnectionModal)
})

onBeforeUnmount(() => {
  window.removeEventListener('open-new-connection-modal', handleOpenNewConnectionModal)
})

function handleOpenNewConnectionModal() {
  openNewConnectionModal(true)
}

// 继续维护原有 CSS 变量，避免其它组件依赖它们时出问题
watch(() => selectedWidget.value, () => {
  // left panel is always visible now
  localeStore.setCssVariable(1, x => x, '--dim-visible-left-panel')
}, {immediate: true})

watch(() => leftPanelWidth.value, () => {
  localeStore.setCssVariable(leftPanelWidth.value, x => `${x}px`, '--dim-left-panel-width')
}, {immediate: true})

watch(() => visibleTitleBar.value, () => {
  localeStore.setCssVariable(visibleTitleBar.value, x => (x ? 1 : 0), '--dim-visible-titlebar')
}, {immediate: true})

subscribeCurrentDbByTab()
subscribeRecentDatabaseSwitch()
</script>

<style scoped>
.root {
  color: var(--theme-font-1);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', 'Helvetica Neue', Helvetica, Arial, sans-serif;
  background: var(--theme-bg-0);
}

/* Make the main workspace + left panel background white (Navicat-like) */
.root :deep(.el-container),
.root :deep(.el-main),
.root :deep(.el-aside),
.root :deep(.el-header),
.root :deep(.el-footer) {
  background: var(--theme-bg-0) !important;
}

/* Element Plus Container 内部容器需要显式变成 flex */
.app-iconbar :deep(.el-aside) {
  height: 100%;
  display: flex;
  flex-direction: column;
  min-height: 0;
  min-width: 0;
  overflow: hidden;
}

/* 左侧面板：外层不滚动，内部各区块自己滚动 */
.app-leftpanel :deep(.el-aside) {
  height: 100%;
  display: flex;
  flex-direction: column;
  min-height: 0;
  min-width: 0;
  overflow: hidden;
}

/* 分割条样式 */
.splitter {
  flex: 0 0 var(--dim-splitter-thickness);
  width: var(--dim-splitter-thickness);
  background: transparent;
  cursor: col-resize;
  position: relative;
}

.splitter::before {
  content: '';
  position: absolute;
  top: 0;
  bottom: 0;
  left: 50%;
  width: 1px;
  transform: translateX(-0.5px);
  background: var(--theme-border);
}

.splitter:hover {
  background: var(--theme-bg-selected);
}

.splitter:hover::before {
  background: var(--theme-bg-selected-point);
}

/* 通知容器 */
.snackbar-container {
  position: fixed;
  right: 16px;
  bottom: calc(var(--dim-statusbar-height) + 16px);
  z-index: 1000;
  pointer-events: none;
  width: auto;
  height: auto;
  max-width: 400px;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
}

.snackbar-container > * {
  pointer-events: auto;
}

.snackbar-container:empty::before {
  content: '';
  display: none;
}

.not-supported {
  display: none;
  text-align: center;
}

.big-icon {
  font-size: 20pt;
}

/* 工具栏区域可拖动窗口 */
.toolbar-header {
  /* Make the toolbar draggable in frameless mode */
  -webkit-app-region: drag;
  /* Wails CSSDragProperty hook (main.go sets CSSDragProperty/Value) */
  --wails-draggable: drag;
}

@media only screen and (max-width: 600px) {
  .tinydb-screen:not(.isElectron) {
    display: none;
  }

  .not-supported:not(.isElectron) {
    display: block;
  }
}
</style>
