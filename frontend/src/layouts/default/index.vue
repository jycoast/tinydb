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
  <Layout class="root tinydb-screen" style="height: 100%; width: 100%; overflow: hidden;">
    <!-- 自定义标题栏（Frameless window）：集成 MenuBar -->
    <TitleBar/>

    <!-- 工具栏 -->
    <LayoutHeader style="height: var(--dim-toolbar-height); line-height: var(--dim-toolbar-height); padding: 0; position: relative; z-index: 200; background: #ffffff; border-bottom: 1px solid #d9d9d9;">
      <ToolBar/>
    </LayoutHeader>

    <!-- 主体内容 -->
    <Layout style="flex: 1; min-height: 0;">
      <!-- 左侧面板：固定显示 DatabaseWidget（去掉左侧图标栏/模块切换栏） -->
      <LayoutSider
        :width="leftPanelWidthPx"
        :trigger="null"
        :collapsible="false"
        style="overflow: hidden;"
      >
        <div style="height: 100%; display: flex; flex-direction: column; overflow: auto;">
          <WidgetContainer/>
        </div>
      </LayoutSider>
      <!-- 分割条 -->
      <div
        class="splitter"
        v-splitterDrag="'clientX'"
        :resizeSplitter="(e) => localeStore.updateLeftPanelWidth(x => x + e.detail)"
      />

      <!-- 主内容区 -->
      <Layout style="flex: 1; min-width: 0; min-height: 0; display: flex; flex-direction: column;">
        <!-- 标签页栏 -->
        <div style="flex: 0 0 var(--dim-tabs-panel-height); height: var(--dim-tabs-panel-height); overflow: hidden;">
          <TabsPanel/>
        </div>
        <!-- 标签页内容 -->
        <LayoutContent style="flex: 1; min-height: 0; position: relative; overflow: hidden;">
          <TabRegister/>
        </LayoutContent>
      </Layout>
    </Layout>

    <!-- 底部状态栏 -->
    <LayoutFooter style="height: var(--dim-statusbar-height); padding: 0; position: relative; z-index: 200; display: flex; align-items: stretch; overflow: visible;">
      <StatusBar/>
    </LayoutFooter>

    <!-- 通知容器 -->
    <div class="snackbar-container"></div>
  </Layout>
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
import ToolBar from './ToolBar.vue'
import TitleBar from './TitleBar.vue'
import bus from '/@/second/utility/bus'
import {Layout} from 'ant-design-vue'

const LayoutHeader = Layout.Header
const LayoutSider = Layout.Sider
const LayoutContent = Layout.Content
const LayoutFooter = Layout.Footer

const excludeFirst = ref(false)
const localeStore = useLocaleStore()
const {selectedWidget, leftPanelWidth, visibleTitleBar} = storeToRefs(localeStore)
const leftPanelWidthPx = computed(() => Math.max(200, Number(leftPanelWidth.value || 280)))

window.addEventListener('resize', debounce(() => {
  if (excludeFirst.value) {
    bus.emitter.emit(bus.resize)
  }
}, 300))

onMounted(() => (excludeFirst.value = true))

// Remove the left iconbar area: collapse its reserved width in CSS vars
onMounted(() => {
  localeStore.setCssVariable(0, (x) => `${x}px`, '--dim-widget-icon-size')
  // Default to database widget so WidgetContainer has content
  if (!selectedWidget.value) {
    localeStore.setSelectedWidget('database')
  }
})

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
.root :deep(.ant-layout),
.root :deep(.ant-layout-content),
.root :deep(.ant-layout-sider),
.root :deep(.ant-layout-sider-children) {
  background: var(--theme-bg-0) !important;
}

/* antd Sider 内部容器需要显式变成 flex */
.app-iconbar :deep(.ant-layout-sider-children) {
  height: 100%;
  display: flex;
  flex-direction: column;
  min-height: 0;
  min-width: 0;
  overflow: hidden;
}

/* 左侧面板：外层不滚动，内部各区块自己滚动 */
.app-leftpanel :deep(.ant-layout-sider-children) {
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

@media only screen and (max-width: 600px) {
  .tinydb-screen:not(.isElectron) {
    display: none;
  }

  .not-supported:not(.isElectron) {
    display: block;
  }
}
</style>
