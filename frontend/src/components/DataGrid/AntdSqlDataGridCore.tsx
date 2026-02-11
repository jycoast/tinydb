import {
  Component,
  defineComponent,
  onBeforeUnmount,
  PropType,
  ref,
  toRefs,
  unref,
  watchEffect,
} from 'vue'
import LoadingDataGridCore from '/@/components/DataGrid/LoadingDataGridCore'
import {GridConfig, GridDisplay, MacroDefinition} from '/@/second/tinydb-datalib'
import ChangeSetGrider from './ChangeSetGrider'
import {databaseConnectionsSqlSelectApi} from '/@/api/simpleApis'
import AntdDataGridCore from '/@/components/DataGrid/AntdDataGridCore.vue'

async function loadDataPage(props: any, offset: number, limit: number) {
  const {display, conid, database} = props
  
  if (!display) {
    return {errorMessage: 'Display is not available'}
  }
  
  if ((display as any).isLoadedCorrectly === false) {
    return {errorMessage: 'Table not found or not loaded correctly'}
  }
  
  const select = display.getPageQuery(offset, limit)
  
  if (!select) {
    return {errorMessage: 'Failed to generate SQL query'}
  }
  
  try {
    const response = (await databaseConnectionsSqlSelectApi({
      conid: unref(conid)!,
      database: unref(database)!,
      select,
    })) as any

    if (response?.errorMessage) {
      return response
    }

    const payload = response?.rows
    if (payload && typeof payload === 'object' && Array.isArray(payload.rows)) {
      return payload.rows
    }
    if (Array.isArray(payload)) {
      return payload
    }
    return {errorMessage: 'Unexpected response while loading rows'}
  } catch (e: any) {
    return {errorMessage: e?.message || String(e || 'Load rows failed')}
  }
}

async function loadRowCount(props: any) {
  const {display, conid, database} = props
  if (!display) return null
  const select = display.getCountQuery()
  if (!select) return null
  try {
    const response = (await databaseConnectionsSqlSelectApi({
      conid: unref(conid)!,
      database: unref(database)!,
      select,
    })) as any

    if (response?.errorMessage) {
      return null
    }

    const payload: any = response?.rows
    const rows = payload && typeof payload === 'object' && Array.isArray(payload.rows) ? payload.rows : payload
    if (!Array.isArray(rows) || rows.length === 0) {
      return null
    }
    
    const first = rows[0]
    if (!first || typeof first !== 'object') {
      return null
    }
    
    // Try multiple possible count field names
    const count = first.count ?? first.COUNT ?? first.Count ?? first?.['COUNT(1)'] ?? first?.['count(*)'] ?? first?.['COUNT(*)']
    if (count == null) {
      // If no count field found, try to get the first numeric value
      const numericValue = Object.values(first).find(v => typeof v === 'number' && Number.isFinite(v))
      if (numericValue != null) {
        return Number(numericValue)
      }
      return null
    }
    
    const n = typeof count === 'number' ? count : Number(count)
    return Number.isFinite(n) && n >= 0 ? n : null
  } catch {
    return null
  }
}

export default defineComponent({
  name: 'AntdSqlDataGridCore',
  props: {
    conid: {type: String as PropType<string>},
    display: {type: Object as PropType<GridDisplay>},
    database: {type: String as PropType<string>},
    schemaName: {type: String as PropType<string>},
    pureName: {type: String as PropType<string>},
    config: {type: Object as PropType<GridConfig>},
    changeSetState: {type: Object as PropType<any>},
    dispatchChangeSet: {type: Function as PropType<(action: any) => void>},
    macroPreview: {type: [String, Object] as PropType<string | Component | MacroDefinition>},
    macroValues: {type: Object as PropType<any>},
    loadedRows: {type: Array as PropType<any[]>, default: () => []},
    selectedCellsPublished: {type: Function as PropType<() => []>, default: () => []},
  },
  emits: ['update:loadedRows', 'update:selectedCellsPublished'],
  setup(props, {attrs, emit}) {
    const {macroPreview, changeSetState, dispatchChangeSet, display, macroValues, loadedRows, selectedCellsPublished} =
      toRefs(props)

    const grider = ref<any>(null)
    const loadedRowsRW = ref(loadedRows.value)
    const selectedCellsPublishedRW = ref(selectedCellsPublished.value)

    function dataPageAvailable(p: any) {
      const {display} = p
      const select = display.getPageQuery(0, 1)
      return !!select
    }

    watchEffect(() => {
      if (!display.value) {
        grider.value = null
        return
      }
      if (!macroPreview.value) {
        console.log(`[AntdSqlDataGridCore] Creating grider for display:`, {
          hasDisplay: !!display.value,
          hasChangeSetState: !!changeSetState.value,
          hasDispatchChangeSet: !!dispatchChangeSet.value,
          loadedRowsCount: loadedRowsRW.value.length
        })
        grider.value = new ChangeSetGrider(loadedRowsRW.value, changeSetState.value, dispatchChangeSet.value, display.value)
        console.log(`[AntdSqlDataGridCore] Grider created:`, {
          hasGrider: !!grider.value,
          rowCount: grider.value?.rowCount
        })
      }
    })

    watchEffect(() => {
      if (!display.value) {
        grider.value = null
        return
      }
      if (macroPreview.value) {
        grider.value = new ChangeSetGrider(
          loadedRowsRW.value,
          changeSetState.value,
          dispatchChangeSet.value,
          display.value,
          macroPreview.value as any,
          macroValues.value,
          selectedCellsPublished.value()
        )
      }
    })

    onBeforeUnmount(() => {
      loadedRowsRW.value = []
      grider.value = null
    })

    watchEffect(() => emit('update:loadedRows', unref(loadedRowsRW.value)))
    watchEffect(() => emit('update:selectedCellsPublished', selectedCellsPublishedRW.value))

    return () => (
      <LoadingDataGridCore
        {...Object.assign({}, props, attrs)}
        coreComponent={AntdDataGridCore}
        loadDataPage={loadDataPage}
        dataPageAvailable={dataPageAvailable}
        loadRowCount={loadRowCount}
        vModel:loadedRows={loadedRowsRW.value}
        vModel:selectedCellsPublished={selectedCellsPublishedRW.value}
        frameSelection={!!macroPreview.value}
        grider={grider.value}
        display={display.value}
      />
    )
  },
})


