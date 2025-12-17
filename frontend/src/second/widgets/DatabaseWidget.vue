<template>
  <div v-show="!hidden" class="dbw-root">
    <!-- Section 1: Connections (independent scroll inside list) -->
    <div class="dbw-section dbw-section--connections">
      <div class="dbw-section-header">连接</div>
      <div class="dbw-section-body">
        <ConnectionList/>
      </div>
    </div>

    <!-- Section 2: Pinned (optional) -->
    <div v-if="showPinned" class="dbw-section dbw-section--pinned">
      <div class="dbw-section-header">收藏</div>
      <div class="dbw-section-body">
        <PinnedObjectsList/>
      </div>
    </div>

    <!-- Section 3: Objects (independent scroll inside list) -->
    <div class="dbw-section dbw-section--objects">
      <div class="dbw-section-header">{{ objectsHeader }}</div>
      <div class="dbw-section-body">
        <template v-if="conid && (database || singleDatabase)">
          <SqlObjectList :conid="conid" :database="database"/>
        </template>
        <template v-else>
          <WidgetsInnerContainer>
            <ErrorInfo message="Database not selected" icon="img alert"/>
          </WidgetsInnerContainer>
        </template>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import {computed, defineComponent, PropType, toRef, unref} from 'vue'
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

export default defineComponent({
  name: "DatabaseWidget",
  props: {
    hidden: {
      type: Boolean as PropType<boolean>,
      default: false,
    }
  },
  components: {
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
        : '表、视图、函数'
      return title.toUpperCase()
    })

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
  overflow: hidden; /* outer doesn't scroll; each section scrolls */
}

.dbw-section {
  display: flex;
  flex-direction: column;
  min-height: 0;
  border-bottom: 1px solid var(--theme-border);
}

.dbw-section-header {
  flex: 0 0 auto;
  padding: 10px 12px;
  font-weight: 700;
  letter-spacing: 0.4px;
  font-size: 12px;
  color: var(--theme-font-2);
  background: var(--theme-bg-1);
}

.dbw-section-body {
  flex: 1;
  min-height: 0;
  background: var(--theme-bg-0);
  /* key: make children (SearchBoxWrapper + WidgetsInnerContainer) layout as a column
     so the list area can take remaining height and scroll */
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* ensure the internal list container actually becomes the scrolling region */
.dbw-section-body :deep(.widgetsInnerContainer) {
  flex: 1 1 auto;
  min-height: 0;
  overflow: auto;
}

/* default ratios: independent scroll areas */
.dbw-section--connections {
  flex: 1.2;
}
.dbw-section--pinned {
  flex: 0.6;
}
.dbw-section--objects {
  flex: 1.2;
}
</style>
