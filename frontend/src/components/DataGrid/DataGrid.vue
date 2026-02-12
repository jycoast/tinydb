<template>
  <!-- Simplified grid view (Navicat-like): remove left manager panel (Columns/Macros/Tools). -->
  <component
    v-if="isFormView"
    :is="formViewComponent"
    v-bind="Object.assign({}, $props, $attrs)"
  />
  <component
    v-else-if="isJsonView"
    :is="jsonViewComponent"
    v-bind="Object.assign({}, $props, $attrs)"
    v-model:loadedRows="loadedRowsRW"
  />
  <component
    v-else
    :is="gridCoreComponent"
    v-bind="Object.assign({}, $props, $attrs)"
    :collapsedLeftColumnStore="collapsedLeftColumnStore"
    :formViewAvailable="!!formViewComponent && !!formDisplay"
    v-model:loadedRows="loadedRowsRW"
    v-model:selectedCellsPublished="selectedCellsPublished"
  />
</template>

<script lang="ts">
import {
  Component,
  computed,
  defineComponent,
  inject,
  PropType,
  provide,
  Ref,
  ref,
  toRaw,
  toRefs,
  unref,
  watch
} from 'vue'
import {fromPairs, isNumber, mapKeys} from 'lodash-es'
import HorizontalSplitter from '/@/components/Elements/HorizontalSplitter.vue'
import VerticalSplitter from '/@/components/Elements/VerticalSplitter.vue'
import MacroDetail from '/@/components/FreeTable/MacroDetail.vue'
import ColumnManager from '/@/components/DataGrid/ColumnManager.vue'
import JsonViewFilters from '/@/components/JsonView/JsonViewFilters'
import FormViewFilters from '/@/components/FormView/FormViewFilters.vue'
import ReferenceManager from '/@/components/DataGrid/ReferenceManager.vue'
import MacroManager from '/@/components/FreeTable/MacroManager.vue'
import FreeTableColumnEditor from '/@/components/FormView/FreeTableColumnEditor.vue'
import {getLocalStorage, setLocalStorage} from '/@/utils/tinydb/storageCache'
import {
  GridConfig,
  GridDisplay,
  MacroDefinition,
  MacroSelectedCell,
  TableFormViewDisplay
} from '/@/lib/tinydb-datalib'
import {Nullable} from '/@/utils/types'

import {Collapse} from 'ant-design-vue'
const CollapsePanel = (Collapse as any).Panel

function extractMacroValuesForMacro(vObject, mObject) {
  // return {};
  const macroValues = unref(vObject)
  const macro = unref(mObject)
  if (!macro) return {}
  return {
    ...fromPairs((macro.args || []).filter(x => x.default != null).map(x => [x.name, x.default])),
    ...mapKeys(macroValues, (_, k) => k.replace(/^.*#/, '')),
  };
}

export default defineComponent({
  name: "DataGrid",
  components: {
    HorizontalSplitter,
    VerticalSplitter,
    MacroDetail,
    ColumnManager,
    JsonViewFilters,
    FormViewFilters,
    ReferenceManager,
    MacroManager,
    FreeTableColumnEditor,
    [Collapse.name]: Collapse,
    ACollapsePanel: CollapsePanel,
  },
  props: {
    gridCoreComponent: {
      type: [String, Object] as PropType<string | Component | any>,
    },
    formViewComponent: {
      type: [String, Object] as PropType<string | Component>,
    },
    jsonViewComponent: {
      type: [String, Object] as PropType<string | Component>,
    },
    config: {
      type: Object as PropType<GridConfig>,
    },
    setConfig: {
      type: Function as PropType<(target: any) => void>
    },
    display: {
      type: Object as PropType<GridDisplay>
    },
    formDisplay: {
      type: Object as PropType<TableFormViewDisplay>
    },
    macroCondition: {
      type: Function as PropType<(macro: any) => boolean>
    },
    useEvalFilters: {
      type: Boolean as PropType<boolean>,
      default: false
    },
    isDetailView: {
      type: Boolean as PropType<boolean>,
      default: false
    },
    showReferences: {
      type: Boolean as PropType<boolean>,
      default: false
    },
    showMacros: {
      type: Boolean as PropType<boolean>,
      default: false
    },
    expandMacros: {
      type: Boolean as PropType<boolean>,
      default: false
    },
    freeTableColumn: {
      type: Boolean as PropType<boolean>,
      default: false
    },
    isDynamicStructure: {
      type: Boolean as PropType<boolean>,
      default: false
    },
    runMacro: {
      type: Function as PropType<(macro: MacroDefinition, params: {}, cells: MacroSelectedCell[]) => void>
    },
    loadedRows: {
      type: Array as PropType<any[]>,
      default: () => []
    },
  },
  emits: ['update:loadedRows'],
  setup(props, {emit}) {
    const {
      config,
      formDisplay,
      display,
      freeTableColumn,
      useEvalFilters,
      isDynamicStructure,
      runMacro,
      setConfig,
      loadedRows,
    } = toRefs(props)

    const gridCoreComponent = toRaw(props.gridCoreComponent)
    const formViewComponent = toRaw(props.formViewComponent)
    const jsonViewComponent = toRaw(props.jsonViewComponent)

    const loadedRowsRW = ref(loadedRows.value)
    const selectedCellsPublished = ref(() => [])
    const domColumnManager = ref<Nullable<{ setSelectedColumns: (value: unknown[]) => void }>>(null)
    const managerSize = ref(0)
    const selectedMacro = ref<Nullable<MacroDefinition>>(null)
    provide('selectedMacro', selectedMacro)
    const macroValues = ref({})
    provide('macroValues', macroValues)

    // Default collapsed (Navicat-like). If user has a saved preference, respect it.
    const leftActiveKeys = ref<string[]>(getLocalStorage('dataGrid_left_active_keys', []) as any)

    const watchVisible = inject<Ref<boolean>>('collapsedLeftColumnStore')
    const collapsedLeftColumnStore = computed(() => unref(watchVisible) || ref(getLocalStorage('dataGrid_collapsedLeftColumn', false)))

    function getInitialManagerSize() {
      const width = getLocalStorage('dataGridManagerWidth')
      if (isNumber(width) && width > 30 && width < 500) {
        return `${width}px`;
      }
      return '300px';
    }

    const isFormView = computed(() => !!(formDisplay.value && formDisplay.value.config && formDisplay.value.config.isFormView))
    const isJsonView = computed(() => !!(config.value && config.value['isJsonView']))
    const jsonFiltersSkip = computed(() => !isDynamicStructure.value || !(display.value && display.value?.filterable))

    const handleExecuteMacro = () => {
      runMacro.value && runMacro.value(selectedMacro.value!, extractMacroValuesForMacro(macroValues.value, selectedMacro.value), selectedCellsPublished.value())
      selectedMacro.value = null
    }

    function switchViewEnabled(view) {
      if (view == 'form') return !!formViewComponent && !!formDisplay.value && !isFormView.value && (display.value && display.value?.baseTable?.primaryKey);
      if (view == 'table') return !!(isFormView || isJsonView);
      if (view == 'json') return !!jsonViewComponent && !isJsonView;
    }

    function switchToView(view) {
      if (view == 'form') {
        display.value && display.value.switchToFormView(selectedCellsPublished.value()[0]['rowData'])
      }
      if (view == 'table') {
        setConfig.value && setConfig.value(cfg => ({
          ...cfg,
          isFormView: false,
          isJsonView: false,
          formViewKey: null,
        }));
      }
      if (view == 'json') {
        display.value && display.value.switchToJsonView();
      }
    }

    function handleChangeSelectedColumns(cols) {
      domColumnManager.value && domColumnManager.value.setSelectedColumns(cols)
    }

    watch(managerSize, () => {
      if (managerSize.value) setLocalStorage('dataGridManagerWidth', managerSize.value)
    })

    watch(
      () => [...leftActiveKeys.value],
      () => setLocalStorage('dataGrid_left_active_keys', leftActiveKeys.value),
      {deep: true}
    )

    watch(() => [...loadedRowsRW.value], () => {
      emit('update:loadedRows', loadedRowsRW.value)
    })

    return {
      domColumnManager,
      gridCoreComponent,
      formViewComponent,
      jsonViewComponent,
      managerSize,
      leftActiveKeys,
      getInitialManagerSize,
      handleChangeSelectedColumns,
      collapsedLeftColumnStore,
      extractMacroValuesForMacro,
      handleExecuteMacro,
      jsonFiltersSkip,
      freeTableColumn,
      display,
      macroValues,
      selectedMacro,
      formDisplay,
      isFormView,
      isJsonView,
      isDynamicStructure,
      useEvalFilters,
      loadedRowsRW,
      selectedCellsPublished
    }
  }
})
</script>

<style scoped>
.left {
  display: flex;
  flex: 1;
  background-color: var(--theme-bg-0);
  min-height: 0;
}

.dg-left-collapse {
  width: 100%;
  min-height: 0;
  overflow: auto;
  padding: 6px 6px 0;
}

.dg-left-collapse :deep(.ant-collapse-header) {
  padding: 6px 8px !important;
  color: var(--theme-font-2);
  background: var(--theme-bg-1);
  border: 1px solid var(--theme-border);
  border-radius: 6px;
}

.dg-left-collapse :deep(.ant-collapse-item) {
  margin-bottom: 8px;
}

.dg-left-collapse :deep(.ant-collapse-content) {
  border: 0;
  background: transparent;
}

.dg-left-collapse :deep(.ant-collapse-content-box) {
  padding: 0;
  margin-top: 6px;
}
</style>
