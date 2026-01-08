<template>
  <div class="cl-root">
    <div class="cl-toolbar">
      <el-space :size="6">
        <el-input
          v-model="filter"
          clearable
          size="small"
          placeholder="Search connection or database"
        />
        <el-tooltip content="Add new connection" placement="bottom">
          <el-button size="small" text @click="openModal">
            <el-icon><Plus /></el-icon>
          </el-button>
        </el-tooltip>
        <el-tooltip content="Refresh connections" placement="bottom">
          <el-button size="small" text @click="handleRefreshConnections">
            <el-icon><Refresh /></el-icon>
          </el-button>
        </el-tooltip>
      </el-space>
    </div>
    <WidgetsInnerContainer>
      <AppObjectList
        v-if="Array.isArray(connectionsWithStatus) && connectionsWithStatus.length > 0"
        :list="connectionsWithStatusList"
        :filter="filter"
        :module="connectionAppObject"
        :subItemsComponent="SubDatabaseList"
        expandOnClick
        :isExpandable="() => true"
        :passProps="{showPinnedInsteadOfUnpin: true}"
        :getIsExpanded="data => expandedConnections.includes(data._id)"
        :setIsExpanded="handleSetIsExpanded"
      />
      <div v-else class="cl-empty">
        <el-empty description="No connections" />
        <div class="cl-empty-actions">
          <el-button type="primary" @click="openModal">
            <el-icon><Plus /></el-icon>
            Add new connection
          </el-button>
        </div>
      </div>
      <ConnectionModal @register="register" @closeCurrentModal="closeModal"/>
    </WidgetsInnerContainer>
  </div>
</template>

<script lang="ts">
import {computed, defineComponent, onMounted, onUnmounted, ref, unref, watch} from 'vue'
import {storeToRefs} from 'pinia'
import {sortBy} from 'lodash-es'
import WidgetsInnerContainer from '/@/second/widgets//WidgetsInnerContainer.vue'
import AppObjectList from '/@/second/appobj/AppObjectList'
import getConnectionLabel from '/@/second/utility/getConnectionLabel'
import ConnectionAppObject from '/@/second/appobj/ConnectionAppObject'
import SubDatabaseList from '/@/second/appobj/SubDatabaseList'
import {useBootstrapStore} from '/@/store/modules/bootstrap'
import runCommand from '/@/second/commands/runCommand'
import ConnectionModal from '/@/second/modals/ConnectionModal.vue'
import {useModal} from '/@/components/Modal'
import {useClusterApiStore} from '/@/store/modules/clusterApi'
import {serverConnectionsRefreshApi} from '/@/api/simpleApis'
import {useConnectionList, useServerStatus} from '/@/api/bridge'
import {IActiveConnection, IConnectionStatus} from '/@/second/typings/types/connections.d'

import { Plus, Refresh } from '@element-plus/icons-vue'

export default defineComponent({
  name: "ConnectionList",
  components: {
    WidgetsInnerContainer,
    AppObjectList,
    ConnectionModal,
  },
  setup() {
    const bootstrap = useBootstrapStore()
    const {openedConnections, expandedConnections} = storeToRefs(bootstrap)
    const clusterApi = useClusterApiStore()
    const {connectionList: connections} = storeToRefs(clusterApi)
    const hidden = ref(false)
    const flag = ref(true)
    const filter = ref('')
    const connectionsWithStatus = ref<IActiveConnection[]>([])
    const serverStatus = ref()

    onMounted(() => {
      useConnectionList<IActiveConnection[]>(clusterApi.setConnectionList)
      useServerStatus<{ [key: string]: IConnectionStatus }>(serverStatus)
    })

    watch(() => [connections, serverStatus], () => {
      connectionsWithStatus.value =
        connections.value && serverStatus.value ?
          connections.value.map(conn => ({...conn, status: serverStatus.value[conn._id]})) :
          connections.value
    }, {
      deep: true
    })

    const connectionsWithStatusList = computed(() =>
      sortBy(connectionsWithStatus.value,
        connection => (getConnectionLabel(unref(connection)) || '').toUpperCase())
    )

    const handleRefreshConnections = async () => {
      try {
        if (flag.value) {
          flag.value = false
          for (const conid of unref(openedConnections)) {
            await serverConnectionsRefreshApi({conid})
          }
        }
      } finally {
        flag.value = true
      }
    }

    const handleSetIsExpanded = async (data: any, value: boolean) => {
      // Requirement: click connection should immediately show all databases.
      // Ensure the server connection is refreshed/opened before rendering database list.
      bootstrap.updateExpandedConnections((old) => (value ? [...old, data._id] : old.filter((x) => x != data._id)))
      if (value) {
        bootstrap.updateOpenedConnections((old) => [...old, data._id])
        try {
          await serverConnectionsRefreshApi({ conid: data._id, keepOpen: true })
        } catch (e) {
          // swallow; ConnectionAppObject/openConnection handles user-facing notifications
          console.error(e)
        }
      }
    }

    const [register, {openModal, closeModal}] = useModal()
    // Allow child items (ConnectionAppObject) to request opening the modal with payload (e.g. edit connection)
    const openConnectionModalHandler = (ev: any) => {
      const detail = ev?.detail
      openModal(true, detail)
    }

    onMounted(() => {
      window.addEventListener('open-connection-modal', openConnectionModalHandler as any)
    })

    onUnmounted(() => {
      window.removeEventListener('open-connection-modal', openConnectionModalHandler as any)
    })

    return {
      hidden,
      filter,
      connectionsWithStatus,
      connectionsWithStatusList,
      getConnectionLabel,
      connectionAppObject: ConnectionAppObject,
      SubDatabaseList,
      runCommand,
      register,
      openModal,
      closeModal,
      connections,
      serverStatus,
      handleRefreshConnections,
      handleSetIsExpanded,
      expandedConnections,
      openedConnections,
      updateExpandedConnections: bootstrap.updateExpandedConnections
    }
  }
})
</script>

<style scoped>
.cl-root {
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden; /* toolbar fixed; list scrolls inside WidgetsInnerContainer */
  background: var(--theme-bg-0);
}

.cl-toolbar {
  display: flex;
  align-items: center;
  padding: 6px 6px 8px;
  border-bottom: 1px solid var(--theme-border);
}

.cl-empty {
  padding: 12px 8px;
}

.cl-empty-actions {
  margin-top: 10px;
  display: flex;
  justify-content: center;
}
</style>
