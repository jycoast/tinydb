<template>
  <ToolStripContainer>
    <div class="table-tab-root">
      <div class="table-tab-main">
        <TableDataGrid
          v-bind="Object.assign({}, $props, $attrs)"
          :config="config"
          :setConfig="configUpdate"
          :cache="cache"
          :setCache="cacheUpdate"
          focusOnVisible
          :changeSetState="changeSetStore"
          :dispatchChangeSet="dispatchChangeSet"
        />
      </div>
      <div class="table-tab-ddl">
        <div class="table-tab-ddl-header">DDL</div>
        <div class="table-tab-ddl-body">
          <div v-if="ddlLoading" class="table-tab-ddl-loading">Loading DDL…</div>
          <div v-else-if="ddlError" class="table-tab-ddl-error">{{ ddlError }}</div>
          <AceEditor
            v-else
            :value="ddlText"
            mode="mysql"
            :options="ddlEditorOptions"
            readOnly
          />
        </div>
      </div>
    </div>
    <template #toolstrip>
      <ToolStripCommandSplitButton
        :buttonLabel="autoRefreshStarted ? `Refresh (every ${autoRefreshInterval}s)` : null"
        :commands="['dataGrid.refresh', ...createAutoRefreshMenu()]"
        hideDisabled
      />

      <!-- <ToolStripCommandButton command="dataGrid.refresh" hideDisabled />
      <ToolStripCommandButton command="dataForm.refresh" hideDisabled /> -->

      <ToolStripCommandButton command="dataForm.goToFirst" hideDisabled />
      <ToolStripCommandButton command="dataForm.goToPrevious" hideDisabled />
      <ToolStripCommandButton command="dataForm.goToNext" hideDisabled />
      <ToolStripCommandButton command="dataForm.goToLast" hideDisabled />

      <ToolStripCommandButton command="tableData.save" />
      <ToolStripCommandButton command="dataGrid.insertNewRow" hideDisabled />
      <ToolStripCommandButton command="dataGrid.deleteSelectedRows" hideDisabled />
      <ToolStripCommandButton command="dataGrid.switchToForm" hideDisabled />
      <ToolStripCommandButton command="dataGrid.switchToTable" hideDisabled />
    </template>
  </ToolStripContainer>
</template>

<script lang="ts">
import {computed, defineComponent, onBeforeUnmount, PropType, provide, ref, toRefs, unref, watch} from 'vue'
import {getLocalStorage, setLocalStorage} from '/@/second/utility/storageCache'
import {createChangeSet, createGridCache} from '/@/second/tinydb-datalib'
import ToolStripContainer from '/@/second/buttons/ToolStripContainer.vue'
import TableDataGrid from '/@/second/datagrid/TableDataGrid.vue'
import ToolStripCommandSplitButton from '/@/second/buttons/ToolStripCommandSplitButton.vue'
import ToolStripCommandButton from '/@/second/buttons/ToolStripCommandButton.vue'
import createUndoReducer from '/@/second/utility/createUndoReducer'
import useGridConfig from '/@/second/utility/useGridConfig'
import {databaseConnectionsSqlSelectApi} from '/@/api/simpleApis'
import AceEditor from '/@/second/query/AceEditor'

export const matchingProps = ['conid', 'database', 'schemaName', 'pureName']
export const allowAddToFavorites = _ => true
const INTERVALS = [5, 10, 15, 13, 60]
export default defineComponent({
  name: 'TableDataTab',
  components: {
    ToolStripContainer,
    TableDataGrid,
    ToolStripCommandButton,
    ToolStripCommandSplitButton,
    AceEditor,
  },
  props: {
    tabid: {
      type: String as PropType<string>
    },
    conid: {
      type: String as PropType<string>
    },
    database: {
      type: String as PropType<string>
    },
    schemaName: {
      type: String as PropType<string>
    },
    pureName: {
      type: String as PropType<string>
    }
  },
  setup(props) {
    const {tabid, conid, database, schemaName, pureName} = toRefs(props)

    let autoRefreshTimer: number | null = null


    const autoRefreshInterval = ref(0)
    const autoRefreshStarted = ref(false)


    // const autoRefreshInterval = ref(getIntSettingsValue('dataGrid.defaultAutoRefreshInterval', 10, 1, 3600));
    // const autoRefreshTimer = ref(null)
    // let connection = ref()
    // watch(() => conid.value, () => {
    //   useConnectionInfo({conid: unref(conid)}, connection)
    // })

    const [changeSetStore, dispatchChangeSet] = createUndoReducer(createChangeSet())

    const config = useGridConfig(tabid.value!)
    const cache = ref(createGridCache())

    function configUpdate(updater) {
      if (updater) config.value = updater(config.value)
    }

    function cacheUpdate(updater) {
      if (updater) cache.value = updater(cache.value)
    }

    const collapsedLeftColumnStore = ref(getLocalStorage('dataGrid_collapsedLeftColumn', false))
    provide('collapsedLeftColumnStore', collapsedLeftColumnStore)

    watch(() => collapsedLeftColumnStore.value, (_, newValue) => {
      setLocalStorage('dataGrid_collapsedLeftColumn', unref(newValue))
    })

    function closeRefreshTimer() {
      if (autoRefreshTimer) {
        clearInterval(autoRefreshTimer)
        autoRefreshTimer = null
      }
    }

    onBeforeUnmount(() => closeRefreshTimer())

    function createAutoRefreshMenu() {
      return [
        { divider: true },
        { command: 'tableData.stopAutoRefresh', hideDisabled: true },
        { command: 'tableData.startAutoRefresh', hideDisabled: true },
        'tableData.setAutoRefresh.1',
        ...INTERVALS.map(seconds => ({ command: `tableData.setAutoRefresh.${seconds}`, text: `...${seconds} seconds` })),
      ]
    }

    // --- Right-side DDL (SHOW CREATE TABLE) ---
    const ddlLoading = ref(false)
    const ddlText = ref('')
    const ddlError = ref('')

    function quoteIdent(name: string) {
      if (!name || name.trim() === '') {
        return ''
      }
      const safe = String(name).replace(/`/g, '``')
      return `\`${safe}\``
    }

    const tableIdent = computed(() => {
      if (!pureName.value || pureName.value.trim() === '') {
        return ''
      }
      if (schemaName.value && schemaName.value.trim() !== '') {
        const schemaPart = quoteIdent(schemaName.value)
        const tablePart = quoteIdent(pureName.value)
        if (!schemaPart || !tablePart) return ''
        return `${schemaPart}.${tablePart}`
      }
      return quoteIdent(pureName.value)
    })

    const ddlEditorOptions = {
      fontSize: 12,
      tabSize: 2,
      useSoftTabs: true,
      wrap: true,
      showLineNumbers: true,
      showGutter: true,
      highlightActiveLine: false,
      highlightGutterLine: false,
      showPrintMargin: false,
      readOnly: true,
    }

    watch(
      () => [conid.value, database.value, schemaName.value, pureName.value],
      async () => {
        ddlError.value = ''
        ddlText.value = ''
        if (!conid.value || !database.value || !pureName.value || !tableIdent.value) return

        ddlLoading.value = true
        try {
          const sql = `SHOW CREATE TABLE ${tableIdent.value};`
          const res = await databaseConnectionsSqlSelectApi({
            conid: conid.value,
            database: database.value,
            select: {sql},
          })
          if ((res as any)?.errorMessage) throw new Error(String((res as any).errorMessage))

          const payload = (res as any)?.rows
          const rows = payload && typeof payload === 'object' && Array.isArray(payload.rows) ? payload.rows : payload
          const first = Array.isArray(rows) ? rows[0] : null
          if (!first || typeof first !== 'object') {
            ddlError.value = '无法获取 DDL（返回为空）'
            return
          }

          const ddl =
            (first as any)['Create Table'] ||
            (first as any)['Create View'] ||
            (first as any)['Create Procedure'] ||
            (first as any)['Create Function'] ||
            (first as any)[Object.keys(first).find((k) => /create/i.test(k)) as any] ||
            (first as any)[Object.keys(first)[Object.keys(first).length - 1]]

          ddlText.value = String(ddl || '')
          if (!ddlText.value) ddlError.value = '无法解析 DDL'
        } catch (e: any) {
          ddlError.value = e?.message || '获取 DDL 失败'
        } finally {
          ddlLoading.value = false
        }
      },
      {immediate: true}
    )

    return {
      config,
      configUpdate,
      cache,
      cacheUpdate,
      changeSetStore,
      dispatchChangeSet,
      createAutoRefreshMenu,
      autoRefreshStarted,
      autoRefreshInterval,
      ddlLoading,
      ddlText,
      ddlError,
      ddlEditorOptions,
    }
  }
})
</script>

<style scoped>
.table-tab-root {
  display: flex;
  flex: 1;
  width: 100%;
  height: 100%;
  min-height: 0;
  min-width: 0;
}

.table-tab-main {
  flex: 1;
  position: relative; /* IMPORTANT: DataGridCore is absolute; contain it within the middle area */
  min-width: 0;
  min-height: 0;
  overflow: hidden;
}

.table-tab-ddl {
  flex: 0 0 420px;
  width: 420px;
  min-width: 320px;
  border-left: 1px solid var(--theme-border);
  background: var(--theme-bg-0);
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.table-tab-ddl-header {
  padding: 8px 10px;
  font-weight: 700;
  font-size: 12px;
  color: var(--theme-font-2);
  border-bottom: 1px solid var(--theme-border);
}

.table-tab-ddl-body {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 0;
}

.table-tab-ddl-loading {
  color: var(--theme-font-3);
}

.table-tab-ddl-error {
  color: #cf1322;
}
</style>
