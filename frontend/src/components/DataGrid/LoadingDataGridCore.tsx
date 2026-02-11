import {defineComponent, PropType, ref, toRefs, watchEffect, nextTick, watch} from 'vue'
import {getIntSettingsValue} from '/@/second/settings/settingsTools'
import createRef from '/@/second/utility/createRef'
import DataGridCore from './DataGridCore.vue'
import {GridDisplay} from '/@/second/tinydb-datalib'
import {isFunction,} from '/@/utils/is'
import Grider from '/@/components/DataGrid/Grider'
import {message} from 'ant-design-vue'

export default defineComponent({
  name: 'LoadingDataGridCore',
  props: {
    coreComponent: {
      // Allow swapping the visual grid implementation (eg. Ant Design Table) while keeping the same loader logic.
      type: [Object, String, Function] as PropType<any>,
      default: () => DataGridCore,
    },
    loadDataPage: {
      type: Function as PropType<(props: any, offset: any, limit: any) => Promise<any>>,
    },
    dataPageAvailable: {
      type: Function as PropType<(props: any) => boolean>,
    },
    loadRowCount: {
      type: Function as PropType<(props: any) => Promise<number>>,
    },
    loadedRows: {
      type: Array as PropType<any[]>,
      default: () => []
    },
    grider: {
      type: Object as PropType<Grider>
    },
    display: {
      type: Object as PropType<GridDisplay>
    },
    masterLoadedTime: {
      type: Number as PropType<number>,
    },
    rowCountLoaded: {
      type: Number as PropType<number>,
    },
    selectedCellsPublished: {
      type: Function as PropType<() => []>,
      default: () => []
    }
  },
  emits: ['update:selectedCellsPublished', 'update:loadedRows'],
  setup(props, {attrs, emit}) {
    const {
      loadDataPage,
      loadedRows,
      selectedCellsPublished,
      loadRowCount,
      display,
      dataPageAvailable,
      grider,
      masterLoadedTime,
      rowCountLoaded
    } = toRefs(props)

    const selectedCellsPublishedRW = ref(selectedCellsPublished.value)
    const isLoadedAll = ref<boolean>(false)
    const allRowCount = ref<Nullable<number>>(null)
    const errorMessage = ref<Nullable<string>>(null)
    const loadedTime = ref(new Date().getTime())
    const domGrid = ref<Nullable<HTMLElement>>(null)
    const loadNextDataRef = createRef<boolean>(false)
    const loadedTimeRef = createRef<number | boolean | null>(null)
    const isLoading = ref(false)
    const lastErrorShown = ref<string>('')

    const handleLoadRowCount = async () => {
      try {
        const count = await loadRowCount.value!(Object.assign({}, props, attrs))
        allRowCount.value = count != null ? count : null
      } catch (e: any) {
        allRowCount.value = null
        errorMessage.value = e?.message || String(e || 'Load row count failed')
      }
    }

    async function loadNextData() {
      if (isLoading.value) return
      loadedTimeRef.set(false)
      isLoading.value = true

      const loadStart = new Date().getTime()
      await nextTick()

      loadedTimeRef.set(loadStart)

      let nextRows: any
      try {
        nextRows = await loadDataPage.value!(
          Object.assign({}, props, attrs),
          loadedRows.value.length,
          getIntSettingsValue('dataGrid.pageSize', 100, 5, 1000)
        )
      } catch (e: any) {
        nextRows = {errorMessage: e?.message || String(e || 'Load data failed')}
      }

      if (loadedTimeRef.get() !== loadStart) {
        return
      }

      isLoading.value = false

      if (nextRows.errorMessage) {
        errorMessage.value = nextRows.errorMessage
      } else {
        if (allRowCount.value == null) await handleLoadRowCount()
        const loadedRowsRW = [...loadedRows.value, ...nextRows]
        emit('update:loadedRows', loadedRowsRW)
        
        // 判断是否已加载完所有数据：
        // 1. 返回的数据为空数组
        // 2. 返回的数据长度小于请求的 limit（说明已经是最后一页）
        // 3. 已加载的数据总数 >= 总行数（如果总行数已知）
        const pageSize = getIntSettingsValue('dataGrid.pageSize', 100, 5, 1000)
        const isLastPage = nextRows.length === 0 || nextRows.length < pageSize
        const hasReachedTotal = allRowCount.value != null && loadedRowsRW.length >= allRowCount.value
        
        isLoadedAll.value = isLastPage || hasReachedTotal
      }

      if (loadNextDataRef.get()) {
        loadNextData()
      }
    }

    function handleLoadNextData() {
      // 如果已经加载完所有数据，或者有错误，或者禁用加载下一页，则不加载
      if (isLoadedAll.value || errorMessage.value || (grider.value && grider.value.disableLoadNextPage)) {
        return
      }
      
      // 如果总行数已知且已加载的数据 >= 总行数，则不加载
      if (allRowCount.value != null && loadedRows.value.length >= allRowCount.value) {
        isLoadedAll.value = true
        return
      }
      
      if (isFunction(dataPageAvailable.value) && dataPageAvailable.value!(Object.assign({}, props, attrs))) {
        void loadNextData()
      }
    }

    function reload() {
      allRowCount.value = null
      isLoading.value = false
      emit('update:loadedRows', [])
      isLoadedAll.value = false
      loadedTime.value = new Date().getTime()
      errorMessage.value = null
      loadNextDataRef.set(false)
    }

    watchEffect(() => {
      if ((display.value! && display.value?.cache?.refreshTime) > loadedTime.value) {
        reload()
      }
    })

    watch(
      () => errorMessage.value,
      (val) => {
        const msg = (val || '').trim()
        if (!msg) return
        if (msg === lastErrorShown.value) return
        lastErrorShown.value = msg
        message.error(`加载数据失败：${msg}`)
      }
    )

    watchEffect(() => {
      if (masterLoadedTime.value && masterLoadedTime.value > loadedTime.value && display.value) {
        display.value.reload()
      }
    })

    watch(() => selectedCellsPublishedRW.value, () => {
      emit('update:selectedCellsPublished', selectedCellsPublishedRW.value)
    })

    return () => {
      const Core: any = (props as any).coreComponent || DataGridCore
      return <Core
      {...Object.assign({}, props, attrs)}
      ref={domGrid}
      vModel:selectedCellsPublished={selectedCellsPublishedRW.value}
      onLoadNextData={handleLoadNextData}
      errorMessage={errorMessage.value}
      isLoading={isLoading.value}
      allRowCount={rowCountLoaded.value ?? allRowCount.value ?? undefined}
      isLoadedAll={isLoadedAll.value}
      loadedTime={loadedTime.value}
      grider={grider.value}
      display={display.value}
      />
    }
  }
})
