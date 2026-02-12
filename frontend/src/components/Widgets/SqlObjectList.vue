<template>
  <WidgetsInnerContainer v-if="status && status.name == 'error'">
    <ErrorInfo :message="`${status.message}`" icon="img error"/>
    <el-button size="small" @click="handleRefreshDatabase">Refresh</el-button>
  </WidgetsInnerContainer>
  <WidgetsInnerContainer v-else-if="objectList.length == 0 &&
  status && status.name != 'pending' && status.name != 'checkStructure' && status.name != 'loadStructure' &&
 objects">
    <ErrorInfo
      :message="`Database ${database} is empty or structure is not loaded, press Refresh button to reload structure`"
      icon="img alert"/>
    <div class="m-1"></div>
    <div class="m-1"></div>
    <el-button size="small" @click="handleRefreshDatabase">Refresh</el-button>
    <template
      v-if="driver && Array.isArray(driver?.databaseEngineTypes) && driver?.databaseEngineTypes?.includes('sql')">
      <div class="m-1"></div>
      <el-button size="small" @click="handleNewTable">New table</el-button>
    </template>
    <template
      v-if="driver && Array.isArray(driver?.databaseEngineTypes) && driver?.databaseEngineTypes?.includes('document')">
      <div class="m-1"></div>
      <el-button size="small" @click="runCommand('new.collection')">New collection</el-button>
    </template>
  </WidgetsInnerContainer>

  <div v-else class="sol-toolbar">
    <el-space :size="6">
      <el-input
        v-model="filter"
        clearable
        size="small"
        placeholder="Search connection or database"
      />
      <el-tooltip content="Add (coming soon)" placement="bottom">
        <el-button size="small" text disabled>
          <el-icon><Plus /></el-icon>
        </el-button>
      </el-tooltip>
      <el-tooltip content="Refresh database connection and object list" placement="bottom">
        <el-button size="small" text @click="handleRefreshDatabase">
          <el-icon><Refresh /></el-icon>
        </el-button>
      </el-tooltip>
    </el-space>
  </div>
  <WidgetsInnerContainer>
    <LoadingInfo
      v-if="(status && (status.name == 'pending' || status.name == 'checkStructure' || status.name == 'loadStructure') && objects) || !objects"
      message="Loading database structure"/>
    <AppObjectList
      v-else
      :list="objectList.map((x: any) => ({ ...x, conid, database }))"
      :module="databaseObjectAppObject"
      :subItemsComponent="SubColumnParamList"
      :groupFunc="handleGroupFunc"
      :isExpandable="handleExpandable"
      :expandIconFunc="chevronExpandIcon"
      :filter="filter"
      :passProps="{showPinnedInsteadOfUnpin: true}"
    />
  </WidgetsInnerContainer>

  <CreateTableModal :onRegister="registerCreateTableModal" />

</template>

<script lang="ts">
import {computed, defineComponent, PropType, ref, toRefs, unref, watch, onBeforeUnmount} from 'vue';
import AppObjectList from '/@/components/AppObject/AppObjectList'
import ErrorInfo from '/@/components/Elements/ErrorInfo.vue'
import LoadingInfo from '/@/components/Elements/LoadingInfo.vue'
import runCommand from '/@/commands/runCommand'
import WidgetsInnerContainer from './WidgetsInnerContainer.vue'
import DatabaseObjectAppObject from '/@/components/DatabaseTree/DatabaseObjectAppObject'
import SubColumnParamList from './SubColumnParamList'
import {getObjectTypeFieldLabel} from '/@/utils/tinydb/common'
import {chevronExpandIcon} from '/@/components/Icon/src/expandIcons'
import {storeToRefs} from 'pinia'
import {flatten, sortBy} from 'lodash-es'
import {
  useConnectionInfo,
  useDatabaseInfo,
  useDatabaseStatus,
  databaseConnectionsRefreshApi,
} from "/@/api"
import {ApplicationDefinition, DatabaseInfo} from '/@/lib/tinydb-types'
import {findEngineDriver} from '/@/lib/tinydb-tools'
import {filterAppsForDatabase} from '/@/utils/tinydb/appTools'
import {useBootstrapStore} from "/@/store/modules/bootstrap"
import {useClusterApiStore} from '/@/store/modules/clusterApi'

import { Plus, Refresh } from '@element-plus/icons-vue'
import { useModal } from '/@/components/Modal'
import CreateTableModal from "/@/components/Modals/CreateTableModal.vue";

export default defineComponent({
  name: "SqlObjectList",
  props: {
    conid: {
      type: String as PropType<string>
    },
    database: {
      type: String as PropType<string>
    }
  },
  components: {
    CreateTableModal,
    AppObjectList,
    WidgetsInnerContainer,
    LoadingInfo,
    ErrorInfo,
  },
  setup(props) {
    const filter = ref('')
    const {conid, database} = toRefs(props)
    const flag = ref(true)
    const clusterApi = useClusterApiStore()
    const {connection} = storeToRefs(clusterApi)

    const [registerCreateTableModal, { openModal: openCreateTableModal }] = useModal()

    const handleNewTable = () => {
      if (unref(conid) && unref(database)) {
        openCreateTableModal(true, { conid: unref(conid), database: unref(database) })
      }
    }

    const handleRefreshDatabase = async () => {
      try {
        if (flag.value) {
          flag.value = false
          await databaseConnectionsRefreshApi({conid: unref(conid)!, database: unref(database)!})
        }
      } finally {
        flag.value = true
      }
    }

    const bootstrap = useBootstrapStore()
    const {currentDatabase, extensions} = storeToRefs(bootstrap)
    let objects = ref()
    let status = ref()

    const objectList = ref<unknown[]>([])
    const dbApps = ref<ApplicationDefinition[]>([])

    const handleGroupFunc = (data) => {
      return getObjectTypeFieldLabel(unref(data).objectTypeField)
    }

    const handleExpandable = (data) => unref(data).objectTypeField == 'tables' ||
      unref(data).objectTypeField == 'views' || unref(data).objectTypeField == 'matviews'

    watch(() => [conid.value, database.value], () => {
      useDatabaseInfo<DatabaseInfo>({conid: unref(conid), database: unref(database)}, objects)
      useDatabaseStatus<{
        name: 'pending' | 'error' | 'loadStructure' | 'ok';
        counter?: number;
        analysedTime?: number;
      }>({conid: unref(conid), database: unref(database)}, status)
      useConnectionInfo({conid: unref(conid)}, clusterApi.setConnection)

      dbApps.value = filterAppsForDatabase(unref(currentDatabase)?.connection, unref(currentDatabase)!.name, [])
    }, {
      immediate: true
    })

    watch(() => [objects.value, dbApps.value], () => {
      objectList.value = flatten([
        ...['tables', 'collections', 'views', 'matviews', 'procedures', 'functions'].map(objectTypeField =>
          sortBy(
            ((objects.value || {})[objectTypeField] || []).map(obj => ({...obj, objectTypeField})),
            ['schemaName', 'pureName']
          )),
        ...unref(dbApps).map(app => {
          app.queries.map(query => ({
            objectTypeField: 'queries',
            pureName: query.name,
            schemaName: app.name,
            sql: query.sql
          }))
        })
      ])
    })

    const driver = computed(() => extensions.value ? findEngineDriver(connection.value, extensions.value) : null)

    onBeforeUnmount(() => {
      objects.value = null
      status.value = null
      connection.value = null
      objectList.value = []
      dbApps.value = []
    })

    return {
      filter,
      status,
      ...toRefs(props),
      handleRefreshDatabase,
      runCommand,
      handleNewTable,
      objectList,
      objects,
      databaseObjectAppObject: DatabaseObjectAppObject,
      SubColumnParamList,
      handleGroupFunc,
      handleExpandable,
      chevronExpandIcon,
      driver,
      registerCreateTableModal: registerCreateTableModal,
      Plus,
      Refresh,
    }
  }
})
</script>

<style scoped>
.sol-toolbar {
  display: flex;
  align-items: center;
  padding: 6px 6px 8px;
  border-bottom: 1px solid var(--theme-border);
}
</style>
