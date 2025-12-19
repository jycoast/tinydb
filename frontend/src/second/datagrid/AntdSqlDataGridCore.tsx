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
import LoadingDataGridCore from '/@/second/datagrid/LoadingDataGridCore'
import {GridConfig, GridDisplay, MacroDefinition} from '/@/second/tinydb-datalib'
import ChangeSetGrider from './ChangeSetGrider'
import {databaseConnectionsSqlSelectApi} from '/@/api/simpleApis'
import AntdDataGridCore from '/@/second/datagrid/AntdDataGridCore.vue'

async function loadDataPage(props: any, offset: number, limit: number) {
  const {display, conid, database} = props
  const select = display.getPageQuery(offset, limit)
  try {
    const response = (await databaseConnectionsSqlSelectApi({
      conid: unref(conid)!,
      database: unref(database)!,
      select,
    })) as any

    if (response?.errorMessage) return response

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
  const select = display.getCountQuery()
  try {
    const response = (await databaseConnectionsSqlSelectApi({
      conid: unref(conid)!,
      database: unref(database)!,
      select,
    })) as any

    const payload: any = response?.rows
    const rows = payload && typeof payload === 'object' && Array.isArray(payload.rows) ? payload.rows : payload
    const first = Array.isArray(rows) ? rows[0] : undefined
    const count = first?.count ?? first?.COUNT ?? first?.Count ?? first?.['COUNT(1)']
    const n = typeof count === 'number' ? count : Number(count)
    return Number.isFinite(n) ? n : 0
  } catch {
    return 0
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
        grider.value = new ChangeSetGrider(loadedRowsRW.value, changeSetState.value, dispatchChangeSet.value, display.value)
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


