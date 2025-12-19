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
      <!-- Splitter: resize DDL panel width -->
      <div
        class="table-tab-splitter"
        v-splitterDrag="'clientX'"
        :resizeSplitter="(e) => handleResizeDdl(e.detail)"
      />
      <div class="table-tab-ddl" :style="ddlPanelStyle">
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
        :commands="(['dataGrid.refresh', ...createAutoRefreshMenu()] as any)"
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

    // --- Resizable right DDL panel ---
    const ddlWidth = ref<number>(Number(getLocalStorage('tableDataTab_ddl_width', 420)) || 420)
    const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n))

    function handleResizeDdl(diff: number) {
      // dragging splitter: diff is mouse deltaX; moving right should increase DDL width
      ddlWidth.value = clamp(ddlWidth.value - diff, 260, 900)
      setLocalStorage('tableDataTab_ddl_width', ddlWidth.value)
    }

    const ddlPanelStyle = computed(() => ({
      width: `${ddlWidth.value}px`,
      flex: `0 0 ${ddlWidth.value}px`,
    }))

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
      useSoftTabs: false,
      wrap: false,
      showLineNumbers: false,
      showGutter: false,
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
      ddlPanelStyle,
      handleResizeDdl,
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
  /* width is controlled by ddlPanelStyle */
  min-width: 320px;
  background: var(--theme-bg-0);
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.table-tab-splitter {
  flex: 0 0 6px;
  width: 6px;
  cursor: col-resize;
  position: relative;
  background: transparent;
}

.table-tab-splitter::before {
  content: '';
  position: absolute;
  left: 50%;
  top: 0;
  bottom: 0;
  width: 1px;
  background: var(--theme-border);
  transform: translateX(-50%);
}

.table-tab-splitter:hover {
  background: rgba(0, 0, 0, 0.04);
}

.table-tab-splitter:hover::before {
  background: var(--theme-bg-selected);
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
  position: relative; /* AceEditor is absolutely positioned; contain it within the DDL panel */
  overflow: hidden; /* Ace handles its own scrolling */
  padding: 0;
}

.table-tab-ddl-loading {
  color: var(--theme-font-3);
}

.table-tab-ddl-error {
  color: #cf1322;
}
</style>
