<template>
  <div class="not-supported">
    <div class="m-5 big-icon">
      <WarningOutlined/>
    </div>
    <div class="m-3">Sorry, tinydb is not supported on mobile devices.</div>
    <div class="m-3">Please visit <a href="https://github.com/tiyongliu/tinydb">tinydb</a> for more
      info.
    </div>
  </div>
  <div class="root tinydb-screen">
    <Layout class="app-shell">
      <LayoutHeader class="app-header">
        <ToolBar/>
      </LayoutHeader>

      <Layout class="app-body">
        <LayoutSider class="app-iconbar" :width="iconbarWidth" :trigger="null" :collapsible="false">
          <WidgetIconPanel/>
        </LayoutSider>

        <LayoutSider
          v-if="selectedWidget"
          class="app-leftpanel"
          :width="leftPanelWidthPx"
          :trigger="null"
          :collapsible="false"
        >
          <WidgetContainer/>
        </LayoutSider>

        <div
          v-if="selectedWidget"
          class="app-splitter horizontal-split-handle"
          v-splitterDrag="'clientX'"
          :resizeSplitter="(e) => localeStore.updateLeftPanelWidth(x => x + e.detail)"
        />

        <Layout class="app-main">
          <div class="app-tabs">
            <TabsPanel/>
          </div>
          <LayoutContent class="app-content">
            <TabRegister/>
          </LayoutContent>
        </Layout>
      </Layout>

      <LayoutFooter class="app-statusbar">
        <StatusBar/>
      </LayoutFooter>

      <div class="snackbar-container"></div>
    </Layout>
  </div>
</template>

<script lang="ts" setup>
import {computed, onMounted, ref, watch} from 'vue'
import {storeToRefs} from 'pinia'
import {debounce} from 'lodash-es'
import {useLocaleStore} from '/@/store/modules/locale'
import {subscribeRecentDatabaseSwitch} from '/@/api/recentDatabaseSwitch'
import {subscribeCurrentDbByTab} from '/@/api/changeCurrentDbByTab'
import WidgetContainer from '/@/second/widgets/WidgetContainer.vue'
import TabsPanel from '/@/second/widgets/TabsPanel.vue'
import TabRegister from './TabRegister.vue'
import StatusBar from '/@/second/widgets/StatusBar.vue'
import {WarningOutlined} from '@ant-design/icons-vue'
import WidgetIconPanel from '/@/second/widgets/WidgetIconPanel.vue'
import ToolBar from './ToolBar.vue'
import bus from '/@/second/utility/bus'
import {Layout} from 'ant-design-vue'

const LayoutHeader = Layout.Header
const LayoutSider = Layout.Sider
const LayoutContent = Layout.Content
const LayoutFooter = Layout.Footer

const excludeFirst = ref(false)
const localeStore = useLocaleStore()
const {selectedWidget, leftPanelWidth, visibleTitleBar} = storeToRefs(localeStore)

const iconbarWidth = computed(() => 56)
const leftPanelWidthPx = computed(() => Math.max(200, Number(leftPanelWidth.value || 280)))

window.addEventListener('resize', debounce(() => {
  if (excludeFirst.value) {
    bus.emitter.emit(bus.resize)
  }
}, 300))

onMounted(() => (excludeFirst.value = true))

// 继续维护原有 CSS 变量，避免其它组件依赖它们时出问题
watch(() => selectedWidget.value, () => {
  localeStore.setCssVariable(selectedWidget.value, x => (x ? 1 : 0), '--dim-visible-left-panel')
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
  height: 100vh;
  width: 100vw;
}

/* 新主布局：ant Layout */
.app-shell {
  height: 100%;
  width: 100%;
  background: var(--theme-bg-0);
}

.app-header {
  height: var(--dim-toolbar-height);
  line-height: var(--dim-toolbar-height);
  padding: 0;
  background: var(--theme-bg-1);
  border-bottom: 1px solid var(--theme-border);
}

.app-body {
  flex: 1;
  min-height: 0;
  background: var(--theme-bg-0);
}

.app-iconbar {
  background: var(--theme-bg-inv-1);
  border-right: 1px solid var(--theme-border);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.app-leftpanel {
  background: var(--theme-bg-1);
  border-right: 1px solid var(--theme-border);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* antd Sider 内部容器需要显式变成 flex 才能正确滚动 */
.app-iconbar :deep(.ant-layout-sider-children),
.app-leftpanel :deep(.ant-layout-sider-children) {
  height: 100%;
  display: flex;
  flex-direction: column;
  min-height: 0;
  min-width: 0;
  /* allow left panel to scroll */
  overflow: auto;
}

.app-splitter {
  flex: 0 0 var(--dim-splitter-thickness);
  width: var(--dim-splitter-thickness);
  background: transparent;
  cursor: col-resize;
}

.app-splitter:hover {
  background: var(--theme-bg-selected);
}

.app-main {
  flex: 1;
  min-width: 0;
  min-height: 0;
  background: var(--theme-bg-0);
  display: flex;
  flex-direction: column;
}

.app-tabs {
  flex: 0 0 var(--dim-tabs-panel-height);
  height: var(--dim-tabs-panel-height);
  background: var(--theme-bg-1);
  border-bottom: 1px solid var(--theme-border);
  position: relative; /* 给 TabsPanel 内部定位提供参照 */
  overflow: hidden;
}

.app-content {
  flex: 1;
  min-width: 0;
  min-height: 0;
  position: relative; /* 给 TabContent 的 absolute 提供参照 */
  overflow: hidden;
  background: var(--theme-bg-0);
}

.app-statusbar {
  height: var(--dim-statusbar-height);
  padding: 0;
  background: var(--theme-bg-statusbar-inv);
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  align-items: stretch;
}

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

/* 隐藏 snackbar-container 的文本内容（如果只是占位符） */
.snackbar-container:empty::before {
  content: '';
  display: none;
}

.titlebar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: var(--dim-titlebar-height);
}

.not-supported {
  display: none;
}

@media only screen and (max-width: 600px) {
  .tinydb-screen:not(.isElectron) {
    display: none;
  }

  .not-supported:not(.isElectron) {
    display: block;
  }
}

.not-supported {
  text-align: center;
}

.big-icon {
  font-size: 20pt;
}
</style>
