<template>
  <div
    class="tb-root"
    :style="dragStyle"
    @dblclick="toggleMaximise"
  >
    <div class="tb-left" :style="dragStyle">
      <div class="tb-app" :style="noDragStyle" @dblclick.stop>
        <img class="tb-icon" :src="logoUrl" alt="tinydb" />
        <span class="tb-title">tinydb</span>
      </div>
      <div class="tb-menubar" :style="noDragStyle" @dblclick.stop>
        <MenuBar />
      </div>
    </div>
    <div class="tb-right" :style="noDragStyle" @dblclick.stop>
      <el-tooltip content="最小化" placement="bottom">
        <el-button text class="tb-btn" @click="minimise">
          <el-icon><Minus /></el-icon>
        </el-button>
      </el-tooltip>
      <el-tooltip :content="isMaximised ? '还原' : '最大化'" placement="bottom">
        <el-button text class="tb-btn" @click="toggleMaximise">
          <el-icon>
            <CopyDocument v-if="isMaximised" />
            <FullScreen v-else />
          </el-icon>
        </el-button>
      </el-tooltip>
      <el-tooltip content="关闭" placement="bottom">
        <el-button text class="tb-btn tb-btn-close" @click="closeWindow">
          <el-icon><Close /></el-icon>
        </el-button>
      </el-tooltip>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { onMounted, onUnmounted, ref } from "vue"
import { Minus, Close, FullScreen, CopyDocument } from "@element-plus/icons-vue"
import {
  WindowIsMaximised,
  WindowMinimise,
  WindowToggleMaximise,
  Quit,
} from "/@/wailsjs/runtime/runtime"
import MenuBar from "./MenuBar.vue"
import logoUrl from "/src/assets/images/logo.png"

const isMaximised = ref(false)

// Wails 通过内联样式识别可拖拽区域（--wails-draggable）
const dragStyle = { "--wails-draggable": "drag" } as const
const noDragStyle = { "--wails-draggable": "no-drag" } as const

async function refreshMaxState() {
  try {
    isMaximised.value = await WindowIsMaximised()
  } catch {
    isMaximised.value = false
  }
}

function minimise() {
  void WindowMinimise()
}

async function toggleMaximise() {
  try {
    await WindowToggleMaximise()
    await refreshMaxState()
  } catch {
    // ignore
  }
}

function closeWindow() {
  void Quit()
}

let timer: number | null = null
onMounted(() => {
  void refreshMaxState()
  timer = window.setInterval(refreshMaxState, 800)
})

onUnmounted(() => {
  if (timer != null) window.clearInterval(timer)
})
</script>

<style scoped>
.tb-root {
  height: var(--dim-menu-bar-height);
  display: flex;
  align-items: stretch;
  justify-content: space-between;
  background: var(--el-bg-color);
  border-bottom: 1px solid var(--el-border-color-lighter);
  user-select: none;
  cursor: move;
}

.tb-left {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  padding-left: 8px;
  gap: 8px;
  cursor: move;
}

.tb-app {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  cursor: default;
}

.tb-icon {
  width: 16px;
  height: 16px;
  object-fit: contain;
}

.tb-title {
  font-size: var(--el-font-size-base);
  color: var(--el-text-color-primary);
}

.tb-menubar {
  flex: 1;
  min-width: 0;
  height: 100%;
  display: flex;
  align-items: center;
  cursor: default;
}

.tb-menubar :deep(.menu-bar-container) {
  background: transparent;
  border-bottom: none;
  height: 100%;
  --wails-draggable: drag;
}

.tb-menubar :deep(.menu-label) {
  height: 100%;

}

.tb-right {
  display: inline-flex;
  align-items: center;
  cursor: default;
}

.tb-btn {
  width: 40px;
  height: 100%;
  border-radius: 0;
  color: var(--el-text-color-primary);
}

.tb-btn:hover {
  background: var(--el-fill-color-light);
}

.tb-btn-close:hover {
  background: var(--el-color-danger);
  color: var(--el-color-white);
}
</style>
