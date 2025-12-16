<template>
  <div v-show="!hidden" class="dbw-root">
    <ACollapse v-model:activeKey="activeKeys" class="dbw-collapse" ghost>
      <ACollapsePanel key="connections">
        <template #header>
          <span class="dbw-header">CONNECTIONS</span>
        </template>
        <div class="dbw-panel-body">
          <ConnectionList/>
        </div>
      </ACollapsePanel>

      <ACollapsePanel v-if="showPinned" key="pinned">
        <template #header>
          <span class="dbw-header">PINNED</span>
        </template>
        <div class="dbw-panel-body">
          <PinnedObjectsList/>
        </div>
      </ACollapsePanel>

      <ACollapsePanel key="dbObjects">
        <template #header>
          <span class="dbw-header">{{ objectsHeader }}</span>
        </template>
        <div class="dbw-panel-body">
          <template v-if="conid && (database || singleDatabase)">
            <SqlObjectList :conid="conid" :database="database"/>
          </template>
          <template v-else>
            <WidgetsInnerContainer>
              <ErrorInfo message="Database not selected" icon="img alert"/>
            </WidgetsInnerContainer>
          </template>
        </div>
      </ACollapsePanel>
    </ACollapse>
  </div>
</template>

<script lang="ts">
import {computed, defineComponent, PropType, ref, toRef, unref, watch} from 'vue'
import {storeToRefs} from 'pinia'
import {useBootstrapStore} from '/@/store/modules/bootstrap'
import {useClusterApiStore} from '/@/store/modules/clusterApi'
import {useLocaleStore} from '/@/store/modules/locale'
import ErrorInfo from '/@/second/elements/ErrorInfo.vue'
import WidgetsInnerContainer from './WidgetsInnerContainer.vue'
import ConnectionList from './ConnectionList.vue'
import SqlObjectList from './SqlObjectList.vue'
import PinnedObjectsList from './PinnedObjectsList'
import {findEngineDriver} from '/@/second/tinydb-tools'
import {Collapse} from 'ant-design-vue'

export default defineComponent({
  name: "DatabaseWidget",
  props: {
    hidden: {
      type: Boolean as PropType<boolean>,
      default: false,
    }
  },
  components: {
    ACollapse: Collapse,
    ACollapsePanel: Collapse.Panel,
    WidgetsInnerContainer,
    ConnectionList,
    SqlObjectList,
    PinnedObjectsList,
    ErrorInfo,
  },
  setup(props) {
    const bootstrap = useBootstrapStore()
    const {currentDatabase, extensions} = storeToRefs(bootstrap)
    const localeStore = useLocaleStore()
    const {pinnedDatabases, pinnedTables} = storeToRefs(localeStore)

    const clusterApi = useClusterApiStore()
    const {connection} = storeToRefs(clusterApi)

    const database = computed(() => unref(currentDatabase)?.name)
    const conid = computed(() =>
      (unref(currentDatabase) && unref(currentDatabase)!.connection)
      ? unref(currentDatabase)?.connection._id : null)
    const driver = computed(() => extensions.value ? findEngineDriver(connection.value, extensions.value) : null)
    const singleDatabase = computed(() => unref(currentDatabase)?.connection?.singleDatabase)

    const showPinned = computed(() => {
      if (pinnedDatabases.value.length) return true
      return pinnedTables.value.some(
        x => currentDatabase.value && x.conid == currentDatabase.value.connection._id && x.database == currentDatabase.value?.name
      )
    })

    const objectsHeader = computed(() => {
      const title = driver.value && Array.isArray(driver.value?.databaseEngineTypes) && driver.value?.databaseEngineTypes?.includes('document')
        ? 'Collections'
        : 'Tables, views, functions'
      return title.toUpperCase()
    })

    const ACTIVE_KEY_STORAGE = 'dbwidget_activeKeys'
    const activeKeys = ref<string[]>(['connections', 'dbObjects'])
    if (showPinned.value) activeKeys.value = ['connections', 'pinned', 'dbObjects']
    try {
      const saved = localStorage.getItem(ACTIVE_KEY_STORAGE)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed)) activeKeys.value = parsed
      }
    } catch (e) {
      // ignore
    }

    watch(() => showPinned.value, (v) => {
      if (v && !activeKeys.value.includes('pinned')) {
        activeKeys.value = ['connections', 'pinned', 'dbObjects']
      }
      if (!v && activeKeys.value.includes('pinned')) {
        activeKeys.value = activeKeys.value.filter(x => x !== 'pinned')
      }
    }, {immediate: true})

    watch(() => activeKeys.value, (v) => {
      try {
        localStorage.setItem(ACTIVE_KEY_STORAGE, JSON.stringify(v))
      } catch (e) {
        // ignore
      }
    }, {deep: true})

    return {
      hidden: toRef(props, 'hidden'),
      pinnedDatabases,
      pinnedTables,
      currentDatabase,
      conid,
      database,
      singleDatabase,
      driver,
      showPinned,
      objectsHeader,
      activeKeys,
    }
  }
})
</script>

<style scoped>
.dbw-root {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  min-width: 0;
  background: var(--theme-bg-1);
  overflow: auto;
}

.dbw-collapse {
  height: auto;
  min-height: 0;
  overflow: visible;
}

.dbw-header {
  font-weight: 700;
  letter-spacing: 0.4px;
  font-size: 12px;
  color: var(--theme-font-2);
}

.dbw-panel-body {
  display: flex;
  flex-direction: column;
  min-height: 0;
  height: auto;
  padding: 0;
}

/* ant Collapse theme tuning */
.dbw-root :deep(.ant-collapse) {
  background: var(--theme-bg-1);
}
.dbw-root :deep(.ant-collapse-item) {
  border-bottom: 1px solid var(--theme-border);
}
.dbw-root :deep(.ant-collapse-header) {
  padding: 10px 12px !important;
  background: var(--theme-bg-1);
}
.dbw-root :deep(.ant-collapse-content) {
  background: var(--theme-bg-0);
}
.dbw-root :deep(.ant-collapse-content-box) {
  padding: 0 !important;
}
</style>
