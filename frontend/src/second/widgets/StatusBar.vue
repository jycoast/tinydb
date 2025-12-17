<template>
  <div class="main">
    <div class="container">
      <template v-if="databaseName">
        <div class="item item-primary">
          <FontIcon icon="icon lock" padRight v-if="connection && connection.isReadOnly"/>
          <FontIcon icon="icon database" padRight v-else/>
          {{ databaseName }}
        </div>
        <div v-if="dbid" class="item clickable 2" title="Database color. Overrides connection color">
          <div class="colorbox" :style="{databaseButtonBackground}">
            <FontIcon icon="icon palette"/>
          </div>
        </div>
      </template>
      <template v-if="connectionLabel">
        <div class="item item-primary">
          <FontIcon icon="icon server" padRight/>
          {{ connectionLabel }}
        </div>
        <div class="item clickable 1" title="Connection color. Can be overriden by database color">
          <div :style="connectionButtonBackground" class="colorbox">
            <FontIcon icon="icon palette"/>
          </div>
        </div>
      </template>
      <div class="item" v-if="connection?.user">
        <FontIcon icon="icon account" padRight/>
        {{ connection.user }}
      </div>
      <div class="item item-primary clickable" v-if="connection && status">
        <template v-if="status && status.name == 'pending'">
          <FontIcon icon="icon loading" padRight/>
          Loading
        </template>
        <template v-else-if="status && status.name == 'checkStructure'">
          <FontIcon icon="icon loading" padRight/>
          Checking model
        </template>
        <template v-else-if="status && status.name == 'loadStructure'">
          <FontIcon icon="icon loading" padRight/>
          Loading model
        </template>
        <template v-else-if="status && status.name == 'ok'">
          <FontIcon icon="img ok-inv" padRight/>
          Connected
        </template>
        <template v-else-if="status && status.name == 'error'">
          <FontIcon icon="img error-inv" padRight/>
          Error
        </template>
      </div>
      <div class="item" v-if="!connection">
        <FontIcon icon="icon disconnected" padRight/>
        Not connected
      </div>
      <div class="item flex" :title="serverVersion.version" v-if="serverVersion">
        <FontIcon icon="icon version" padRight/>
        <div class="version">
          {{ serverVersion.versionText || serverVersion.version }}
        </div>
      </div>
      <div class="item flex clickable" v-if="status && status?.analysedTime"
           :title="`Last ${databaseName} model refresh: ${analysedTimeFormat}\nClick for refresh DB model`"
           @click="handleSyncModel">
        <FontIcon icon="icon history" padRight/>
        <div class="version ml-1">
          {{ analysedTimeFromNow + (timerValue ? '' : '') }}
        </div>
      </div>
    </div>
    <div class="container" v-for="item in contextItems">
      <div class="item">
        <FontIcon :icon="item.icon" padRight/>
        {{ item.text }}
      </div>
    </div>
  </div>
</template>
<script lang="ts">
import {storeToRefs} from 'pinia'
import {computed, defineComponent, onBeforeUnmount, onMounted, ref, unref, watch} from 'vue';
import FontIcon from '/@/second/icons/FontIcon.vue'
import {useBootstrapStore} from "/@/store/modules/bootstrap"
import getConnectionLabel from "/@/second/utility/getConnectionLabel"
import {useDatabaseServerVersion, useDatabaseStatus} from "/@/api/bridge"
import { formatToDateTime, fromNow } from '/@/utils/dateUtil';
export default defineComponent({
  name: 'StatusBar',
  components: {
    FontIcon
  },
  setup() {
    const bootstrap = useBootstrapStore()
    const {currentDatabase} = storeToRefs(bootstrap)

    const databaseName = computed(() => currentDatabase.value && currentDatabase.value.name)
    const connection = computed(() => currentDatabase.value && currentDatabase.value.connection)
    const dbid = computed(() => connection.value ? {
      conid: connection.value._id,
      database: databaseName.value
    } : null)


    const connectionLabel = computed(() => getConnectionLabel(unref(connection), {allowExplicitDatabase: false}))
    const contextItems = []
    // const databaseButtonBackground = useConnectionColor(dbid, 6, 'dark', true, false)
    const databaseButtonBackground = '------'
    const connectionButtonBackground = '------'

    let timerId: ReturnType<typeof setInterval> | null
    let status = ref()
    let serverVersion = ref()
    const timerValue = ref(1)

    watch(() => [dbid.value, connection.value], () => {
      useDatabaseStatus<{
        name: 'pending' | 'error' | 'loadStructure' | 'ok';
        counter?: number;
        analysedTime?: number;
      }>(dbid.value || {}, status)

      useDatabaseServerVersion<Nullable<{ version: string; versionText: string }>>(dbid.value || {}, serverVersion)
    })

    onMounted(() => {
      timerId = setInterval(() => {
        timerValue.value++
      }, 10000)
    })

    onBeforeUnmount(() => {
      timerId && clearInterval(timerId)
    })

    async function handleSyncModel() {

    }

    return {
      databaseName,
      connection,
      dbid,
      databaseButtonBackground,
      connectionButtonBackground,
      connectionLabel,
      status,
      serverVersion,
      handleSyncModel,
      contextItems,
      timerValue,
      analysedTimeFromNow: fromNow(status.value?.analysedTime),
      analysedTimeFormat: formatToDateTime(status.value?.analysedTime, 'HH:mm:ss')
    }
  }


})

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

.colorbox {
  padding: 2px 6px;
  border-radius: 6px;
  color: var(--theme-font-1);
  background: var(--theme-bg-2);
  border: 1px solid var(--theme-border);
  transition: all 0.2s ease;
}

.colorbox:hover {
  background: var(--theme-bg-hover);
}
</style>
