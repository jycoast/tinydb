<template>
  <div class="main">
    <div class="container">
      <template v-if="databaseName">
        <div class="item item-primary">
          <el-icon class="pad-right" v-if="connection && connection.isReadOnly">
            <Lock />
          </el-icon>
          <el-icon class="pad-right" v-else>
            <DataBoard />
          </el-icon>
          {{ databaseName }}
        </div>
      </template>
      <template v-if="connectionLabel">
        <div class="item item-primary">
          <el-icon class="pad-right">
            <Monitor />
          </el-icon>
          {{ connectionLabel }}
        </div>
      </template>
      <div class="item" v-if="connection?.user">
        <el-icon class="pad-right">
          <User />
        </el-icon>
        {{ connection.user }}
      </div>
      <div class="item item-primary clickable" v-if="connection && status">
        <template v-if="status.name == 'pending'">
          <el-icon class="pad-right is-loading">
            <Loading />
          </el-icon>
          Loading
        </template>
        <template v-else-if="status.name == 'checkStructure'">
          <el-icon class="pad-right is-loading">
            <Loading />
          </el-icon>
          Checking model
        </template>
        <template v-else-if="status.name == 'loadStructure'">
          <el-icon class="pad-right is-loading">
            <Loading />
          </el-icon>
          Loading model
        </template>
        <template v-else-if="status.name == 'ok'">
          <el-icon class="pad-right el-icon-success">
            <CircleCheck />
          </el-icon>
          Connected
        </template>
        <template v-else-if="status.name == 'error'">
          <el-icon class="pad-right el-icon-danger">
            <CircleClose />
          </el-icon>
          Error
        </template>
      </div>
      <div class="item" v-if="!connection">
        <el-icon class="pad-right">
          <Connection />
        </el-icon>
        Not connected
      </div>
      <div class="item flex" :title="serverVersion.version" v-if="serverVersion">
        <el-icon class="pad-right">
          <Tickets />
        </el-icon>
        <div class="version">
          {{ serverVersion.versionText || serverVersion.version }}
        </div>
      </div>
      <div class="item flex clickable" v-if="status?.analysedTime"
           :title="`Last ${databaseName} model refresh: ${analysedTimeFormat}\nClick for refresh DB model`"
           @click="handleSyncModel">
        <el-icon class="pad-right">
          <Clock />
        </el-icon>
        <div class="version ml-1">
          {{ analysedTimeFromNow + (timerValue ? '' : '') }}
        </div>
      </div>
    </div>
    <div class="container" v-for="item in contextItems">
      <div class="item">
        <el-icon class="pad-right">
          <component :is="getIconComponent(item.icon)" />
        </el-icon>
        {{ item.text }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {storeToRefs} from "pinia"
import {computed, onBeforeUnmount, onMounted, ref, unref, watch} from "vue"
import {useBootstrapStore} from "/@/store/modules/bootstrap"
import getConnectionLabel from "/@/utils/tinydb/getConnectionLabel"
import {useDatabaseServerVersion, useDatabaseStatus} from "/@/api"
import {formatToDateTime, fromNow} from "/@/utils/dateUtil"
import {
  Lock,
  DataBoard,
  Brush,
  Monitor,
  User,
  Loading,
  CircleCheck,
  CircleClose,
  Connection,
  Tickets,
  Clock,
  Close,
  ArrowRight,
  Document,
  Link,
  Grid,
  Folder
} from '@element-plus/icons-vue'

const bootstrap = useBootstrapStore()
const {currentDatabase} = storeToRefs(bootstrap)

const databaseName = computed(() => currentDatabase.value?.name)
const connection = computed(() => currentDatabase.value?.connection)
const dbid = computed(() => connection.value ? {conid: connection.value._id, database: databaseName.value} : null)
const connectionLabel = computed(() => getConnectionLabel(unref(connection), {allowExplicitDatabase: false}))
const contextItems: any[] = []

let timerId: ReturnType<typeof setInterval> | null = null
const status = ref<{ name: string; counter?: number; analysedTime?: number }>()
const serverVersion = ref<{ version: string; versionText: string } | null>()
const timerValue = ref(1)

const analysedTimeFromNow = computed(() => fromNow(status.value?.analysedTime))
const analysedTimeFormat = computed(() => formatToDateTime(status.value?.analysedTime, "HH:mm:ss"))

// Icon mapping for context items
const iconMap: Record<string, any> = {
  'icon loading': Loading,
  'icon close': Close,
  'icon lock': Lock,
  'icon database': DataBoard,
  'icon palette': Brush,
  'icon server': Monitor,
  'icon account': User,
  'icon disconnected': Connection,
  'icon version': Tickets,
  'icon history': Clock,
  'icon menu-right': ArrowRight,
  'icon query': Document,
  'icon new-connection': Link,
  'img ok-inv': CircleCheck,
  'img error-inv': CircleClose,
  'img server': Monitor,
  'img database': DataBoard,
  'img table': Grid,
  'img folder': Folder,
}

function getIconComponent(iconName: string) {
  return iconMap[iconName] || Document
}

watch(() => [dbid.value, connection.value], () => {
  useDatabaseStatus(dbid.value || {}, status)
  useDatabaseServerVersion(dbid.value || {}, serverVersion)
})

onMounted(() => {
  timerId = setInterval(() => { timerValue.value++ }, 10000)
})

onBeforeUnmount(() => {
  timerId && clearInterval(timerId)
})

function handleSyncModel() {
  // TODO: 实现同步模型
}
</script>

<style scoped>
.main {
  display: flex;
  color: var(--theme-font-2);
  background: var(--theme-bg-1);
  border-top: 1px solid var(--theme-border);
  align-items: stretch;
  justify-content: space-between;
  cursor: default;
  flex: 1;
  font-size: 12px;
  padding: 0 8px;
  width: 100%;
  height: 100%;
}

.container {
  display: flex;
  align-items: stretch;
  gap: 2px;
}

.item {
  padding: 0 10px;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: background-color 0.2s ease;
}

.item-primary {
  color: var(--theme-font-1);
  font-weight: 500;
}

.version {
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.clickable {
  cursor: pointer;
  border-radius: 6px;
}

.clickable:hover {
  background-color: var(--theme-bg-hover);
}

.colorbox:hover {
  background: var(--theme-bg-hover);
}

.pad-left {
  margin-left: 0.25rem;
}

.pad-right {
  margin-right: 0.25rem;
}

.el-icon-success {
  color: var(--el-color-success);
}

.el-icon-danger {
  color: var(--el-color-danger);
}

.is-loading {
  animation: rotating 1.5s linear infinite;
}

@keyframes rotating {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>
