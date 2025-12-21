<template>
  <LoadingInfo
    v-if="!display || (!isDynamicStructure && (!columns || columns.length == 0))"
    wrapper message="Waiting for structure"/>

  <div v-else-if="errorMessage">
    <ErrorInfo :message="errorMessage" alignTop/>
  </div>

  <div v-else-if="isDynamicStructure && isLoadedAll && grider && grider?.rowCount == 0">
    <ErrorInfo
      alignTop
      :message="grider.editable
      ? 'No rows loaded, check filter or add new documents. You could copy documents from ohter collections/tables with Copy advanved/Copy as JSON command.'
      : 'No rows loaded'"
    />
  </div>

  <div v-else-if="grider && grider.errors && grider.errors.length > 0">
    <ErrorInfo v-for="err in grider.errors" :message="err" isSmall/>
  </div>

  <div v-else class="container" ref="container" @wheel="handleGridWheel">
    <!--  todo 现在还不清楚具体使用场景，暂时注释，如果我们点页面Hide按钮，把列表的所有column隐藏了，就会显示出来  -->
    <input ref="domFocusField" class="focus-field" @keydown="handleGridKeyDown"/>
    <table
      class="table"
      :class="{ 'force-horizontal-scroll': shouldShowHorizontalScroll }"
      @contextmenu.prevent="handleContext"
      @dblclick="handleGridDoubleClick"
      @mousedown="handleGridMouseDown"
      @mousemove="handleGridMouseMove"
      @mouseup="handleGridMouseUp">
      <thead>
      <tr>
        <td
          class="header-cell"
          data-row="header"
          data-col="header"
          :style="`width:${headerColWidth}px; min-width:${headerColWidth}px; max-width:${headerColWidth}px`">
          <CollapseButton
            :collapsed="collapsedLeftColumnStore"
            @click="updateCollapsedLeftColumn"/>
        </td>
        <td
          v-for="col in visibleRealColumns"
          :key="col.uniqueName"
          class="header-cell"
          data-row="header"
          :data-col="`${col.colIndex}`"
          :style="`width:${col.width}px; min-width:${col.width}px; max-width:${col.width}px`">
          <ColumnHeaderControl
            :column="col"
            :conid="conid"
            :database="database"
            :setSort="display && display.sortable ? order => display.setSort(col.uniqueName, order) : null"
            :addToSort="display && display.sortable ? order => display.addToSort(col.uniqueName, order) : null"
            :order="display && display.sortable ? display.getSortOrder(col.uniqueName) : null"
            :orderIndex="display && display.sortable ? display.getSortOrderIndex(col.uniqueName) : -1"
            :isSortDefined="display && display.sortable ? display.isSortDefined() : false"
            :clearSort="display && display.sortable ? () => display.clearSort() : null"
            @resizeSplitter="e => {(display && col) && display.resizeColumn(col.uniqueName, col.width, e.detail)}"
            :setGrouping="display.groupable ? groupFunc => display.setGrouping(col.uniqueName, groupFunc) : null"
            :grouping="display.getGrouping(col.uniqueName)"
            :allowDefineVirtualReferences="allowDefineVirtualReferences"
          />
        </td>
      </tr>
      <tr v-if="display && display.filterable">
        <td
          class="header-cell"
          data-row="filter"
          data-col="header"
          :style="`width:${headerColWidth}px; min-width:${headerColWidth}px; max-width:${headerColWidth}px`">
          <InlineButton v-if="display.filterCount > 0" @click="() => display.clearFilters()" square>
            <FontIcon icon="icon filter-off"/>
          </InlineButton>
        </td>

        <td
          v-for="col in visibleRealColumns"
          :key="col.uniqueName"
          class="filter-cell"
          data-row="filter"
          :data-col="`${col.colIndex}`"
          :style="`width:${col.width}px; min-width:${col.width}px; max-width:${col.width}px`">
          <DataFilterControl
            :foreignKey="col.foreignKey"
            :columnName="col.uniquePath.length == 1 ? col.uniquePath[0] : null"
            :uniqueName="col.uniqueName"
            :pureName="col.pureName"
            :schemaName="col.schemaName"
            :conid="conid"
            :database="database"
            :jslid="jslid"
            :driver="display?.driver"
            :filterType="useEvalFilters ? 'eval' : col.filterType || getFilterType(col.dataType)"
            :filter="display ? display.getFilter(col.uniqueName) : null"
            :setFilter="value => display.setFilter(col.uniqueName, value)"
            showResizeSplitter
            @dispatchResizeSplitter="(e) => display.resizeColumn(col.uniqueName, col.width, e.detail)"
          />
        </td>
      </tr>
      </thead>

      <tbody>
      <DataGridRow
        v-for="rowIndex in griders"
        :key="rowIndex"
        :rowIndex="rowIndex"
        :grider="grider"
        :conid="conid"
        :database="database"
        :visibleRealColumns="visibleRealColumns"
        :rowHeight="rowHeight"
        :autofillSelectedCells="autofillSelectedCells"
        :isDynamicStructure="isDynamicStructure"
        :selectedCells="filterCellsForRow(selectedCells, rowIndex)"
        :autofillMarkerCell="filterCellForRow(autofillMarkerCell, rowIndex)"
        :focusedColumns="display.focusedColumns"
        :inplaceEditorState="inplaceEditorState"
        :currentCellColumn="currentCell && currentCell[0] == rowIndex ? currentCell[1] : null"
        :dispatchInsplaceEditor="dispatchInsplaceEditor"
        :frameSelection="frameSelection"
        :setFormView="formViewAvailable && display && display?.baseTable?.primaryKey ? handleSetFormView : null"
      />
      </tbody>
    </table>
    <HorizontalScrollBar
      v-if="shouldShowHorizontalScroll"
      :minimum="0"
      :maximum="maxScrollColumn"
      :viewportRatio="(gridScrollAreaWidth && columnSizes) ? gridScrollAreaWidth / columnSizes.getVisibleScrollSizeSum() : null"
      @scroll="updateHorizontalColumnIndex"
      ref="domHorizontalScroll"
    />
    <VerticalScrollBar
      :minimum="0"
      :maximum="grider.rowCount - visibleRowCountUpperBound + 2"
      :viewportRatio="visibleRowCountUpperBound / grider.rowCount"
      @scroll="updateVerticalRowIndex"
      ref="domVerticalScroll"
    />

    <!-- Bottom-left edit actions: commit / delete / insert / discard -->
    <div v-if="grider && grider.editable" class="edit-actions" @mousedown.stop @click.stop>
      <ATooltip title="提交当前修改">
        <AButton size="small" shape="circle" type="default" :disabled="!grider.allowSave" @click="handleCommitChanges">
          <template #icon><CheckOutlined /></template>
        </AButton>
      </ATooltip>
      <ATooltip title="删除选中的行">
        <AButton size="small" shape="circle" type="default" :disabled="!hasSelectedRows" @click="handleDeleteSelectedRows">
          <template #icon><MinusOutlined /></template>
        </AButton>
      </ATooltip>
      <ATooltip title="新增一行">
        <AButton size="small" shape="circle" type="default" :disabled="!grider.canInsert" @click="handleInsertNewRow">
          <template #icon><PlusOutlined /></template>
        </AButton>
      </ATooltip>
      <ATooltip title="放弃当前修改">
        <AButton size="small" shape="circle" type="default" :disabled="!grider.containsChanges" @click="handleDiscardAllChanges">
          <template #icon><CloseOutlined /></template>
        </AButton>
      </ATooltip>
    </div>
    <div v-if="selectedCellsInfo" class="row-count-label">{{ selectedCellsInfo }}</div>
    <div v-else-if="allRowCount != null && multipleGridsOnTab" class="row-count-label">
      Rows: {allRowCount.toLocaleString()}
    </div>
    <LoadingInfo v-if="isLoading" wrapper message="Loading data"/>
  </div>
</template>

<script lang="ts">
import {
  computed,
  defineComponent,
  inject,
  PropType,
  ref,
  Ref,
  toRefs,
  unref,
  watch,
  watchEffect,
  reactive,
} from 'vue'
import {
  compact,
  flatten,
  get,
  isEqual,
  isNaN,
  isNumber,
  max,
  min,
  pick,
  range,
  sumBy,
  uniq,
  keys
} from 'lodash-es'
import {storeToRefs} from 'pinia'
import ErrorInfo from '/@/second/elements/ErrorInfo.vue'
import LoadingInfo from '/@/second/elements/LoadingInfo.vue'
import CollapseButton from '/@/second/datagrid/CollapseButton.vue'
import HorizontalScrollBar from '/@/second/datagrid/HorizontalScrollBar.vue'
import VerticalScrollBar from '/@/second/datagrid/VerticalScrollBar.vue'
import ColumnHeaderControl from '/@/second/datagrid/ColumnHeaderControl.vue'
import DataFilterControl from '/@/second/datagrid/DataFilterControl.vue'
import DataGridRow from '/@/second/datagrid/DataGridRow.vue'
import InlineButton from '/@/second/buttons/InlineButton.vue'
import FontIcon from '/@/second/icons/FontIcon.vue'
import {Button, Tooltip} from 'ant-design-vue'
import {CheckOutlined, CloseOutlined, MinusOutlined, PlusOutlined} from '@ant-design/icons-vue'
import {
  cellIsSelected,
  countColumnSizes,
  countVisibleRealColumns,
  filterCellForRow,
  filterCellsForRow
} from '/@/second/datagrid/gridutil'
import {useStatusBarTabItem} from '/@/second/widgets/useStatusBarTabItem'
import {dataGridRowHeight} from './DataGridRowHeightMeter.vue'
import registerCommand from '/@/second/commands/registerCommand'
import {GridDisplay} from '/@/second/tinydb-datalib'
import Grider from '/@/second/datagrid/Grider'
import {SeriesSizes} from '/@/second/datagrid/SeriesSizes'
import {
  CellAddress,
  cellFromEvent,
  emptyCellArray,
  getCellRange,
  isRegularCell,
  nullCell,
  topLeftCell
} from './selection'
import {registerMenu} from '/@/second/utility/contextMenu'
import {message, Modal} from 'ant-design-vue'
import {copyRowsFormatDefs, copyRowsToClipboard} from '/@/second/utility/clipboard'
import {getFilterType} from '/@/second/tinydb-filterparser'
import createRef from '/@/second/utility/createRef'
import {isCtrlOrCommandKey} from '/@/second/utility/common'
import openReferenceForm, {openPrimaryKeyForm} from '/@/second/formview/openReferenceForm'
import createReducer from '/@/second/utility/createReducer'
import stableStringify from 'json-stable-stringify'
import {useBootstrapStore} from '/@/store/modules/bootstrap'
import keycodes from '/@/second/utility/keycodes'
import bus from '/@/second/utility/bus'
import {useContextMenu} from "/@/hooks/web/useContextMenu";
import {useLocaleStore} from "/@/store/modules/locale";
import {ContextMenuItem} from "/@/second/modals/typing"
import {databaseConnectionsSqlSelectApi} from '/@/api/simpleApis'
registerCommand({
  id: 'dataGrid.refresh',
  category: 'Data grid',
  name: 'Refresh',
  keyText: 'F5 | CtrlOrCommand+R',
  toolbar: true,
  isRelatedToTab: true,
  icon: 'icon reload',
})
function getSelectedCellsInfo(selectedCells, grider: Grider, realColumnUniqueNames, selectedRowData) {
  if (selectedCells.length > 1 && selectedCells.every(x => isNumber(x[0]) && isNumber(x[1]))) {
    let sum = sumBy(selectedCells, (cell: string[]) => {
      const row = grider.getRowData(cell[0]);
      if (row) {
        const colName = realColumnUniqueNames[cell[1]];
        if (colName) {
          const data = row[colName];
          if (!data) return 0;
          let num = +data;
          if (isNaN(num)) return 0;
          return num;
        }
      }
      return 0;
    });
    let count = selectedCells.length;
    let rowCount = selectedRowData.length;
    return `Rows: ${rowCount.toLocaleString()}, Count: ${count.toLocaleString()}, Sum:${sum.toLocaleString()}`;
  }
  return null;
}

export default defineComponent({
  name: 'DataGridCore',
  components: {
    ErrorInfo,
    LoadingInfo,
    DataFilterControl,
    HorizontalScrollBar,
    VerticalScrollBar,
    CollapseButton,
    ColumnHeaderControl,
    DataGridRow,
    InlineButton,
    FontIcon,
    [Button.name]: Button,
    [Tooltip.name]: Tooltip,
    CheckOutlined,
    MinusOutlined,
    PlusOutlined,
    CloseOutlined,
  },
  props: {
    grider: {
      type: Object as PropType<Grider>,
    },
    display: {
      type: Object as PropType<GridDisplay>,
    },
    conid: {
      type: String as PropType<string>
    },
    database: {
      type: String as PropType<string>
    },
    frameSelection: {
      type: Boolean as PropType<boolean>
    },
    isLoading: {
      type: Boolean as PropType<boolean>,
      default: false
    },
    allRowCount: {
      type: Number as PropType<number>,
    },
    changeSelectedColumns: {
      type: Function as PropType<(cols: any[]) => void>,
    },
    focusOnVisible: {
      type: Boolean as PropType<boolean>,
      default: false
    },
    formViewAvailable: {
      type: Boolean as PropType<boolean>,
      default: false
    },
    errorMessage: {
      type: String as PropType<string | null>,
    },
    collapsedLeftColumnStore: {
      type: Object as PropType<Ref<boolean>>,
      default: ref(true)
    },
    allowDefineVirtualReferences: {
      type: Boolean as PropType<boolean>,
      default: false
    },
    isDynamicStructure: {
      type: Boolean as PropType<boolean>,
      default: false
    },
    multipleGridsOnTab: {
      type: Boolean as PropType<boolean>,
      default: false
    },
    tabControlHiddenTab: {
      type: Boolean as PropType<boolean>,
      default: false
    },
    useEvalFilters: {
      type: Boolean as PropType<boolean>,
      default: false
    },
    isLoadedAll: {
      type: Boolean as PropType<boolean>,
      default: false
    },
    loadedTime: {
      type: Number as PropType<number>,
      default: 0
    },
    jslid: {
      type: [String, Number] as PropType<string | number>
    },
    referenceClick: {
      type: Function as PropType<(value: any) => void>
    },
    selectedCellsPublished: {
      type: Function as PropType<() => []>,
      default: () => []
    }
  },
  emits: ['update:selectedCellsPublished', 'loadNextData'],
  setup(props, {emit}) {
    const {
      conid,
      database,
      errorMessage,
      grider,
      display,
      collapsedLeftColumnStore,
      allRowCount,
      changeSelectedColumns,
      focusOnVisible,
      referenceClick
    } = toRefs(props)

    const bootstrap = useBootstrapStore()
    const locale = useLocaleStore()
    const {copyRowsFormat} = storeToRefs(locale)

    //StatusBarTabItem hooks
    useStatusBarTabItem(allRowCount)

    const container = ref<Nullable<HTMLElement>>(null)
    const domFocusField = ref<Nullable<HTMLElement>>(null)
    const domHorizontalScroll = ref<Nullable<{ scroll: (value: number) => void, $el: HTMLElement }>>(null)
    const domVerticalScroll = ref<Nullable<{ scroll: (value: number) => void, $el: HTMLElement }>>(null)
    const wheelRowCount = ref(5)
    const firstVisibleRowScrollIndex = ref(0)
    const firstVisibleColumnScrollIndex = ref(0)
    const currentCell = ref<CellAddress>(topLeftCell)
    const selectedCells = ref<CellAddress[]>([topLeftCell])
    const dragStartCell = ref<Nullable<CellAddress>>(nullCell)
    const shiftDragStartCell = ref<Nullable<CellAddress>>(nullCell)
    const autofillDragStartCell = ref<Nullable<CellAddress>>(nullCell)
    const autofillSelectedCells = ref<CellAddress[]>(emptyCellArray)
    const columnSizes = ref<SeriesSizes>()

    const domFilterControlsRef = createRef<object>({})
    const lastPublishledSelectedCellsRef = createRef<string>('')

    const containerWidth = ref(container.value ? container.value.clientWidth : 0)
    const containerHeight = ref(container.value ? container.value.clientWidth : 0)

    const columns = computed(() => display.value?.allColumns || [])
    const rowHeight = computed(() => dataGridRowHeight.value)
    const autofillMarkerCell = computed(() => selectedCells.value && selectedCells.value.length > 0 && uniq(selectedCells.value.map(x => x[0])).length == 1
      ? [max(selectedCells.value.map(x => x[0])), max(selectedCells.value.map(x => x[1]))]
      : null)
    const headerColWidth = computed(() => 40)
    const gridScrollAreaHeight = computed(() => containerHeight.value - 2 * rowHeight.value)
    const gridScrollAreaWidth = computed(() => columnSizes.value ? containerWidth.value - columnSizes.value?.frozenSize - headerColWidth.value - 32 : 0)
    const visibleRowCountUpperBound = computed(() => Math.ceil(gridScrollAreaHeight.value / Math.floor(Math.max(1, rowHeight.value))))
    const visibleRowCountLowerBound = computed(() => Math.floor(gridScrollAreaHeight.value / Math.ceil(Math.max(1, rowHeight.value))))
    const visibleRealColumns = computed(() => columnSizes.value ? countVisibleRealColumns(
      columnSizes.value,
      firstVisibleColumnScrollIndex.value,
      gridScrollAreaWidth.value,
      columns.value,
    ) : [])
    const selectedCellsInfo = computed(() => getSelectedCellsInfo(selectedCells.value, grider.value!, realColumnUniqueNames.value, getSelectedRowData()))
    const realColumnUniqueNames = computed<any[]>(() => (columnSizes.value ? range(columnSizes.value.realCount) : []).map(
      realIndex => (columns.value[columnSizes.value!.realToModel(realIndex)] || {}).uniqueName
    ))
    const maxScrollColumn = computed(() => (columns.value && columnSizes.value) ?
      columnSizes.value?.scrollInView(0, columns.value.length - 1 - columnSizes.value.frozenCount, gridScrollAreaWidth.value) : 0)
    
    // 计算表格总宽度，用于判断是否需要显示滚动条
    const totalTableWidth = computed(() => {
      if (!columnSizes.value) return 0
      return headerColWidth.value + columnSizes.value.getVisibleScrollSizeSum()
    })
    
    // 判断是否需要强制显示水平滚动条
    const shouldShowHorizontalScroll = computed(() => {
      if (!columnSizes.value || !containerWidth.value) return false
      return totalTableWidth.value > gridScrollAreaWidth.value
    })

    const griders = computed(() => {
      return grider.value
        ? range(firstVisibleRowScrollIndex.value, Math.min(firstVisibleRowScrollIndex.value + visibleRowCountUpperBound.value, grider.value.rowCount))
        : []
    })

    const tabVisible = inject<Ref<Nullable<boolean>>>('tabVisible')
    // const tabid = inject('tabid')

    bus.emitter.on(bus.resize, updateWidgetStyle)

    function updateWidgetStyle() {
      if (container.value && container.value!.clientWidth) containerWidth.value = container.value!.clientWidth
      if (container.value && container.value!.clientHeight) containerHeight.value = container.value!.clientHeight
    }

    watch(() => [collapsedLeftColumnStore.value], updateWidgetStyle)

    watch(() => [
      // grider.value, columns.value,
      containerWidth.value, display.value], () => {
    })

    watchEffect(() => {
      columnSizes.value = countColumnSizes(grider.value!, columns.value, containerWidth.value, display.value!)
      updateWidgetStyle()
    })

    // watch(() => [display.value], () => {
    //   updateWidgetStyle()
    // })

    watch(() => selectedCells.value, () => {
      // PERF: this watcher runs on every cell click. Only stringify the actual selection array,
      // not the Ref wrapper (which is much larger and can cause noticeable jank).
      const stringified = stableStringify(selectedCells.value)
      if (lastPublishledSelectedCellsRef.get() != stringified) {
        lastPublishledSelectedCellsRef.set(stringified)
        const cellsValue = () => getCellsPublished(selectedCells.value)
        emit('update:selectedCellsPublished', cellsValue)
        bootstrap.setSelectedCellsCallback(cellsValue)
        if (changeSelectedColumns.value) changeSelectedColumns.value(getSelectedColumns().map(x => x.columnName))
      }
    })

    watch(() => [firstVisibleRowScrollIndex.value, visibleRowCountUpperBound.value, grider.value, rowHeight.value], async () => {
      if (firstVisibleRowScrollIndex.value + visibleRowCountUpperBound.value >= grider.value!.rowCount && rowHeight.value > 0) {
        emit('loadNextData')
      }
    })

    watchEffect(() => {
      if (unref(tabVisible) && domFocusField.value && focusOnVisible.value) {
        domFocusField.value && domFocusField.value.focus()
      }

      if (display.value && display.value?.groupColumns && display.value?.baseTableOrSimilar && referenceClick.value) {
        referenceClick.value({
          referenceId: stableStringify(display.value && display.value.groupColumns),
          schemaName: display.value.baseTableOrSimilar?.schemaName,
          pureName: display.value.baseTableOrSimilar?.pureName,
          columns: display.value.groupColumns.map(col => ({
            baseName: col,
            refName: col,
            dataType: get(
              display.value!.baseTableOrView?.columns?.find(x => x.columnName == col),
              'dataType'
            ),
          }))
        })
      }
    })

    function getSelectedRowIndexes() {
      if (selectedCells.value.find(x => x[0] == 'header')) return range(0, grider.value!.rowCount);
      return uniq((selectedCells.value || []).map(x => x[0])).filter(x => isNumber(x));
    }

    function getSelectedColumnIndexes() {
      if (selectedCells.value.find(x => x[1] == 'header')) return range(0, realColumnUniqueNames.value.length);
      return uniq((selectedCells.value || []).map(x => x[1])).filter(x => isNumber(x));
    }

    function getSelectedRowData() {
      return grider.value ? compact(getSelectedRowIndexes().map(index => grider.value!.getRowData(index))) : []
    }

    function getSelectedColumns() {
      return realColumnUniqueNames.value ? compact(
        getSelectedColumnIndexes().map((index: number) => ({
          columnName: realColumnUniqueNames.value[index],
        }))
      ) : []
    }

    const [inplaceEditorState, dispatchInsplaceEditor] = createReducer((_, action) => {
      switch (action.type) {
        case 'show':
          if (!grider.value || !grider.value.editable) return {}
          return {
            cell: action.cell,
            text: action.text,
            selectAll: action.selectAll,
          }
        case 'close':
          if (domFocusField.value) domFocusField.value.focus();
          if (action.mode == 'enter' || action.mode == 'tab' || action.mode == 'shiftTab') {
            setTimeout(() => {
              if (isRegularCell(currentCell.value)) {
                switch (action.mode) {
                  case 'enter':
                    moveCurrentCell(currentCell.value[0] + 1, currentCell.value[1]);
                    break
                  case 'tab':
                    moveCurrentCellWithTabKey(false)
                    break
                  case 'shiftTab':
                    moveCurrentCellWithTabKey(true)
                    break
                }
              }
            }, 0)
          }
      }
      return {}
    }, {})

    function handleGridKeyDown(event) {
      if (inplaceEditorState.value) return

      // Copy selection (Ctrl/Cmd + C)
      if (isCtrlOrCommandKey(event) && event.keyCode === keycodes.c) {
        // @ts-ignore
        event.preventDefault()
        copyToClipboardCore(copyRowsFormat.value)
        return
      }

      if (
        !event.ctrlKey &&
        !event.altKey &&
        !event.metaKey &&
        ((event.keyCode >= keycodes.a && event.keyCode <= keycodes.z) ||
          (event.keyCode >= keycodes.n0 && event.keyCode <= keycodes.n9) ||
          (event.keyCode >= keycodes.numPad0 && event.keyCode <= keycodes.numPad9) ||
          event.keyCode == keycodes.dash)
      ) {
        // @ts-ignore
        event.preventDefault();
        dispatchInsplaceEditor({type: 'show', text: event.key, cell: currentCell});
      }

      if (event.keyCode == keycodes.f2 || event.keyCode == keycodes.enter) {
        // @ts-ignore
        if (!showMultilineCellEditorConditional(currentCell)) {
          dispatchInsplaceEditor({type: 'show', cell: currentCell, selectAll: true});
        }
      }

      if (event.shiftKey) {
        if (!isRegularCell(shiftDragStartCell.value!)) {
          shiftDragStartCell.value = currentCell.value;
        }
      } else {
        shiftDragStartCell.value = nullCell;
      }

      handleCursorMove(event);

      if (
        event.shiftKey &&
        event.keyCode != keycodes.shift &&
        event.keyCode != keycodes.tab &&
        event.keyCode != keycodes.ctrl &&
        event.keyCode != keycodes.leftWindowKey &&
        event.keyCode != keycodes.rightWindowKey &&
        !(
          (event.keyCode >= keycodes.a && event.keyCode <= keycodes.z) ||
          (event.keyCode >= keycodes.n0 && event.keyCode <= keycodes.n9) ||
          (event.keyCode >= keycodes.numPad0 && event.keyCode <= keycodes.numPad9) ||
          event.keyCode == keycodes.dash
        )
      ) {
        selectedCells.value = getCellRange(shiftDragStartCell.value || currentCell.value, currentCell.value);
      }
    }

    function handleCursorMove(event) {
      if (!isRegularCell(currentCell.value)) return null;
      let rowCount = grider.value!.rowCount;
      if (isCtrlOrCommandKey(event)) {
        switch (event.keyCode) {
          case keycodes.upArrow:
          case keycodes.pageUp:
            return moveCurrentCell(0, currentCell.value[1], event);
          case keycodes.downArrow:
          case keycodes.pageDown:
            return moveCurrentCell(rowCount - 1, currentCell.value[1], event);
          case keycodes.leftArrow:
            return moveCurrentCell(currentCell.value[0], 0, event);
          case keycodes.rightArrow:
            return moveCurrentCell(currentCell.value[0], columnSizes.value!.realCount - 1, event);
          case keycodes.home:
            return moveCurrentCell(0, 0, event);
          case keycodes.end:
            return moveCurrentCell(rowCount - 1, columnSizes.value!.realCount - 1, event);
          case keycodes.a:
            selectedCells.value = [['header', 'header']];
            event.preventDefault();
            return ['header', 'header'];
        }
      } else {
        switch (event.keyCode) {
          case keycodes.upArrow:
            if (currentCell.value[0] == 0) return focusFilterEditor(currentCell.value[1]);
            return moveCurrentCell(currentCell.value[0] - 1, currentCell.value[1], event);
          case keycodes.downArrow:
            return moveCurrentCell(currentCell.value[0] + 1, currentCell.value[1], event);
          case keycodes.enter:
            if (!grider.value?.editable) return moveCurrentCell(currentCell.value[0] + 1, currentCell.value[1], event);
            break;
          case keycodes.leftArrow:
            return moveCurrentCell(currentCell.value[0], currentCell.value[1] - 1, event);
          case keycodes.rightArrow:
            return moveCurrentCell(currentCell.value[0], currentCell.value[1] + 1, event);
          case keycodes.home:
            return moveCurrentCell(currentCell.value[0], 0, event);
          case keycodes.end:
            return moveCurrentCell(currentCell.value[0], columnSizes.value!.realCount - 1, event);
          case keycodes.pageUp:
            return moveCurrentCell(currentCell.value[0] - visibleRowCountLowerBound.value, currentCell.value[1], event);
          case keycodes.pageDown:
            return moveCurrentCell(currentCell.value[0] + visibleRowCountLowerBound.value, currentCell.value[1], event);
          case keycodes.tab: {
            return moveCurrentCellWithTabKey(event.shiftKey);
          }
        }
      }
    }

    function focusFilterEditor(columnRealIndex) {
      let modelIndex = columnSizes.value!.realToModel(columnRealIndex);
      const domFilter = domFilterControlsRef.get()[columns[modelIndex].uniqueName];
      if (domFilter) domFilter.focus()
      return ['filter', columnRealIndex]
    }

    const originMenu = reactive([])
    registerMenu(
      originMenu,
      { command: 'dataGrid.refresh' },
      { placeTag: 'copy' },
      {
        text: 'Copy advanced',
        submenu: [
          keys(copyRowsFormatDefs).map(format => ({
            text: copyRowsFormatDefs[format].label,
            onClick: () => copyToClipboardCore(format),
          })),
          { divider: true },
          keys(copyRowsFormatDefs).map(format => ({
            text: `Set format: ${copyRowsFormatDefs[format].name}`,
            onClick: () => locale.setCopyRowsFormat(format),
          })),

          // { text: 'Copy as text', onClick: () => copyToClipboardCore('text') },
          // { text: 'Copy as CSV', onClick: () => copyToClipboardCore('csv') },
          // { text: 'Copy as JSON', onClick: () => copyToClipboardCore('json') },
        ],
      },
      { placeTag: 'switch' },
      { divider: true },
      { placeTag: 'save' },
      { command: 'dataGrid.revertRowChanges', hideDisabled: true },
      { command: 'dataGrid.revertAllChanges', hideDisabled: true },
      { command: 'dataGrid.deleteSelectedRows' },
      { command: 'dataGrid.insertNewRow' },
      { command: 'dataGrid.cloneRows' },
      { command: 'dataGrid.setNull' },
      { placeTag: 'edit' },
      { divider: true },
      { command: 'dataGrid.findColumn' },
      { command: 'dataGrid.hideColumn' },
      { command: 'dataGrid.filterSelected' },
      { command: 'dataGrid.clearFilter' },
      { command: 'dataGrid.undo', hideDisabled: true },
      { command: 'dataGrid.redo', hideDisabled: true },
      { divider: true },
      { command: 'dataGrid.editCellValue', hideDisabled: true },
      { command: 'dataGrid.newJson', hideDisabled: true },
      { command: 'dataGrid.editJsonDocument', hideDisabled: true },
      { command: 'dataGrid.viewJsonDocument', hideDisabled: true },
      { command: 'dataGrid.viewJsonValue', hideDisabled: true },
      { command: 'dataGrid.openJsonArrayInSheet', hideDisabled: true },
      { command: 'dataGrid.saveCellToFile', hideDisabled: true },
      { command: 'dataGrid.loadCellFromFile', hideDisabled: true },
      // { command: 'dataGrid.copyJsonDocument', hideDisabled: true },
      { divider: true },
      { placeTag: 'export' },
      { command: 'dataGrid.generateSqlFromData' },
      { command: 'dataGrid.openFreeTable' },
      { command: 'dataGrid.openChartFromSelection' },
      { command: 'dataGrid.openSelectionInMap', hideDisabled: true },
      { placeTag: 'chart' }
    )

    function buildMenu(): Array<ContextMenuItem[] | ContextMenuItem> {
      return [
        unref(originMenu),
        {
          text: copyRowsFormatDefs[copyRowsFormat.value].label,
          onClick: () => copyToClipboardCore(copyRowsFormat.value),
          keyText: 'CtrlOrCommand+C',
          tag: 'copy',
        },
      ];
    }

    const [createContextMenu] = useContextMenu()
    function handleContext(e: MouseEvent) {
      createContextMenu({
        event: e,
        items: buildMenu as () => ContextMenuItem[],
      });
    }

    function copyToClipboardCore(format: string) {
      const rowIndexes = getSelectedRowIndexes()
        .slice()
        .filter(isNumber)
        .sort((a, b) => (a as number) - (b as number)) as number[]
      const colIndexes = getSelectedColumnIndexes()
        .slice()
        .filter(isNumber)
        .sort((a, b) => (a as number) - (b as number)) as number[]

      const columnsToCopy = compact(colIndexes.map((idx: number) => realColumnUniqueNames.value[idx]))
      const rowsToCopy = compact(rowIndexes.map((idx: number) => grider.value?.getRowData(idx)))

      if (!columnsToCopy.length || !rowsToCopy.length) {
        message.info('没有可复制的数据')
        return
      }

      const keyColumns =
        display.value?.baseTable?.primaryKey?.columns?.map((x: any) => x.columnName) ||
        (display.value as any)?.changeSetKeyFields ||
        []

      copyRowsToClipboard(format, columnsToCopy, rowsToCopy, {
        schemaName: display.value?.baseTableOrSimilar?.schemaName,
        pureName: display.value?.baseTableOrSimilar?.pureName,
        driver: display.value?.driver,
        keyColumns,
      })
    }

    function handleGridDoubleClick(event: MouseEvent) {
      const cell = cellFromEvent(event)
      if (!isRegularCell(cell)) return
      if (!grider.value?.editable) {
        message.warning('当前数据源为只读，不能编辑')
        return
      }
      if (!showMultilineCellEditorConditional(cell)) {
        dispatchInsplaceEditor({type: 'show', cell, selectAll: true})
      }
    }

    function updateCollapsedLeftColumn() {
      void updateWidgetStyle()
      collapsedLeftColumnStore.value = !collapsedLeftColumnStore.value
    }

    function cellsToRegularCells(cells) {
      cells = flatten(
        cells.map(cell => {
          if (cell[1] == 'header') {
            return range(0, columnSizes.value!.count).map(col => [cell[0], col]);
          }
          return [cell]
        })
      );
      cells = flatten(
        cells.map(cell => {
          if (cell[0] == 'header') {
            return range(0, grider.value!.rowCount).map(row => [row, cell[1]]);
          }
          return [cell]
        })
      );
      return cells.filter(isRegularCell);
    }

    function getCellsPublished(cells) {
      const regular = cellsToRegularCells(cells);
      return regular
        .map(cell => {
          const row = cell[0];
          const rowData = grider.value!.getRowData(row);
          const column = realColumnUniqueNames[cell[1]];
          return {
            row,
            rowData,
            column,
            value: rowData && rowData[column],
            engine: display.value?.driver,
          };
        })
        .filter(x => x.column)
    }


    function showMultilineCellEditorConditional(cell) {
      if (!cell) return false
      const rowData = grider.value!.getRowData(cell[0])
      if (!rowData) return null
      const cellData = rowData[realColumnUniqueNames.value[cell[1]]]
      // PERF: avoid console logging on the hot click-to-edit path (can freeze UI for large values)
      /*if (shouldOpenMultilineDialog(cellData)) {
        showModal(EditCellDataModal, {
          value: cellData,
          onSave: value => grider.setCellValue(cell[0], realColumnUniqueNames[cell[1]], value),
        });
        return true;
      }*/
      return false
    }

    const hasSelectedRows = computed(() => getSelectedRowIndexes().filter(isNumber).length > 0)

    function quoteIdent(name: string) {
      // Validate name to avoid SQL syntax errors (empty string would generate ``)
      if (!name || (typeof name === 'string' && name.trim() === '')) {
        return ''
      }
      const safe = String(name).replace(/`/g, '``')
      return `\`${safe}\``
    }

    function sqlLiteral(value: any): string {
      if (value === null || value === undefined) return 'NULL'
      if (typeof value === 'number' && Number.isFinite(value)) return String(value)
      if (typeof value === 'boolean') return value ? '1' : '0'
      if (value instanceof Date) return `'${value.toISOString().slice(0, 19).replace('T', ' ')}'`
      if (typeof value === 'object') {
        const json = JSON.stringify(value)
        return `'${(json || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`
      }
      const s = String(value)
      return `'${s.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`
    }

    function buildWhere(condition: Record<string, any> | null | undefined) {
      if (!condition || Object.keys(condition).length === 0) return ''
      const parts = Object.entries(condition).map(([k, v]) => {
        if (v === null || v === undefined) return `${quoteIdent(k)} IS NULL`
        return `${quoteIdent(k)} = ${sqlLiteral(v)}`
      })
      return parts.length ? ` WHERE ${parts.join(' AND ')}` : ''
    }

    async function handleCommitChanges() {
      if (!grider.value?.allowSave) return
      if (!conid.value || !database.value) return

      const base = display.value?.baseTableOrSimilar
      if (!base?.pureName) {
        message.error('无法提交：未识别当前表')
        return
      }

      const tableName =
        base.schemaName ? `${quoteIdent(base.schemaName)}.${quoteIdent(base.pureName)}` : `${quoteIdent(base.pureName)}`

      const cs = (grider.value as any)?.changeSet
      if (!cs) {
        message.error('无法提交：缺少变更集')
        return
      }

      const statements: string[] = []

      for (const item of cs.deletes || []) {
        const where = buildWhere(item.condition)
        if (where) statements.push(`DELETE FROM ${tableName}${where};`)
      }

      for (const item of cs.updates || []) {
        const fields = item.fields || {}
        const sets = Object.entries(fields)
          .filter(([k]) => !!k)
          .map(([k, v]) => `${quoteIdent(k)} = ${sqlLiteral(v)}`)
        const where = buildWhere(item.condition)
        if (sets.length && where) statements.push(`UPDATE ${tableName} SET ${sets.join(', ')}${where};`)
      }

      for (const item of cs.inserts || []) {
        const fields = item.fields || {}
        const cols = Object.keys(fields).filter(Boolean)
        if (!cols.length) continue
        const colSql = cols.map(quoteIdent).join(', ')
        const valSql = cols.map((k) => sqlLiteral(fields[k])).join(', ')
        statements.push(`INSERT INTO ${tableName} (${colSql}) VALUES (${valSql});`)
      }

      if (!statements.length) {
        message.info('没有可提交的修改（请先修改/新增/删除）')
        return
      }

      Modal.confirm({
        title: '提交修改',
        content: `确定要提交 ${statements.length} 条变更吗？`,
        okText: '提交',
        cancelText: '取消',
        onOk: async () => {
          try {
            for (const sql of statements) {
              const res = await databaseConnectionsSqlSelectApi({
                conid: conid.value,
                database: database.value,
                select: { sql },
              })
              if ((res as any)?.errorMessage) throw new Error(String((res as any).errorMessage))
            }
            grider.value?.revertAllChanges()
            display.value?.reload?.()
            message.success('提交成功')
          } catch (e: any) {
            message.error(e?.message || '提交失败')
          }
        },
      })
    }

    function handleDiscardAllChanges() {
      if (!grider.value?.containsChanges) return
      Modal.confirm({
        title: '放弃修改',
        content: '确定要放弃当前所有未提交的修改吗？',
        okText: '放弃',
        cancelText: '取消',
        onOk: () => {
          grider.value?.revertAllChanges()
          message.success('已放弃修改')
        },
      })
    }

    function handleDeleteSelectedRows() {
      if (!grider.value?.editable) return
      const rows = getSelectedRowIndexes().filter(isNumber) as number[]
      if (!rows.length) return
      Modal.confirm({
        title: '删除行',
        content: `确定要标记删除选中的 ${rows.length} 行吗？（点击对勾提交后才会写入数据库）`,
        okText: '删除',
        cancelText: '取消',
        onOk: () => {
          grider.value?.beginUpdate?.()
          for (const r of rows) grider.value?.deleteRow?.(r)
          grider.value?.endUpdate?.()
          message.success('已标记删除')
        },
      })
    }

    function handleInsertNewRow() {
      if (!grider.value?.canInsert) return
      const newRow = grider.value.insertRow()
      if (newRow == null) return
      const cell: any = [newRow, 0]
      currentCell.value = cell
      selectedCells.value = [cell]
      scrollIntoView(cell)
      message.success('已新增一行（编辑后点击对勾提交）')
    }

    function handleGridWheel(event) {
      if (event.shiftKey) {
        scrollHorizontal(event.deltaY, event.deltaX);
      } else {
        scrollHorizontal(event.deltaX, event.deltaY);
        scrollVertical(event.deltaX, event.deltaY);
      }
    }

    function scrollVertical(deltaX, deltaY) {
      let newFirstVisibleRowScrollIndex = firstVisibleRowScrollIndex.value
      if (deltaY > 0 && deltaX === -0) {
        newFirstVisibleRowScrollIndex += wheelRowCount.value
      } else if (deltaY < 0 && deltaX === -0) {
        newFirstVisibleRowScrollIndex -= wheelRowCount.value
      }

      let rowCount = grider.value!.rowCount
      if (newFirstVisibleRowScrollIndex + visibleRowCountLowerBound.value > rowCount) {
        newFirstVisibleRowScrollIndex = rowCount - visibleRowCountLowerBound.value + 1;
      }
      if (newFirstVisibleRowScrollIndex < 0) {
        newFirstVisibleRowScrollIndex = 0;
      }

      firstVisibleRowScrollIndex.value = newFirstVisibleRowScrollIndex;
      domVerticalScroll.value && domVerticalScroll.value.scroll(newFirstVisibleRowScrollIndex)

      // domVerticalScroll.value.node.dispatchEvent(new Event('scroll'))
      domVerticalScroll.value && domVerticalScroll.value.$el.dispatchEvent(new MouseEvent('scroll'))
    }

    function scrollHorizontal(deltaX, deltaY) {
      let newFirstVisibleColumnScrollIndex = firstVisibleColumnScrollIndex.value
      if (deltaX > 0 && deltaY === -0) {
        newFirstVisibleColumnScrollIndex++;
      } else if (deltaX < 0 && deltaY === -0) {
        newFirstVisibleColumnScrollIndex--;
      }

      if (newFirstVisibleColumnScrollIndex > maxScrollColumn.value) {
        newFirstVisibleColumnScrollIndex = maxScrollColumn.value
      }
      if (newFirstVisibleColumnScrollIndex < 0) {
        newFirstVisibleColumnScrollIndex = 0
      }
      firstVisibleColumnScrollIndex.value = newFirstVisibleColumnScrollIndex
      domHorizontalScroll.value!.scroll(newFirstVisibleColumnScrollIndex)
      domHorizontalScroll.value && domHorizontalScroll.value.$el.dispatchEvent(new MouseEvent('scroll'))
    }

    function setCellValue(cell, value) {
      grider.value && grider.value.setCellValue(cell[0], realColumnUniqueNames.value[cell[1]], value);
    }

    function moveCurrentCell(row, col, event: Nullable<Event> = null) {
      const rowCount = grider.value!.rowCount;

      if (row < 0) row = 0;
      if (row >= rowCount) row = rowCount - 1;
      if (col < 0) col = 0;
      if (col >= columnSizes.value!.realCount) col = columnSizes.value!.realCount - 1;
      currentCell.value = [row, col];
      selectedCells.value = [[row, col]];
      scrollIntoView([row, col]);


      if (event) event.preventDefault();
      return [row, col];
    }

    function moveCurrentCellWithTabKey(isShift) {
      if (!isRegularCell(currentCell.value)) return null

      if (isShift) {
        if (currentCell.value[1] > 0) {
          return moveCurrentCell(currentCell.value[0], currentCell.value[1] - 1, event);
        } else {
          return moveCurrentCell(currentCell.value[0] - 1, columnSizes.value!.realCount - 1, event);
        }
      } else {
        if (currentCell.value[1] < columnSizes.value!.realCount - 1) {
          return moveCurrentCell(currentCell.value[0], currentCell.value[1] + 1, event);
        } else {
          return moveCurrentCell(currentCell.value[0] + 1, 0, event);
        }
      }
    }

    function scrollIntoView(cell) {
      const [row, col] = cell;

      if (row != null) {
        let newRow: number | null = null
        const rowCount = grider.value!.rowCount
        if (rowCount == 0) return

        if (row < firstVisibleRowScrollIndex.value) newRow = row
        else if (row + 1 >= firstVisibleRowScrollIndex.value + visibleRowCountLowerBound.value)
          newRow = row - visibleRowCountLowerBound.value + 2

        if (newRow! < 0) newRow = 0
        if (newRow! >= rowCount) newRow = rowCount - 1

        if (newRow != null) {
          firstVisibleRowScrollIndex.value = newRow
          domVerticalScroll.value!.scroll(newRow)
        }
      }

      if (col != null) {
        if (col >= columnSizes.value!.frozenCount) {
          let newColumn = columnSizes.value!.scrollInView(
            firstVisibleColumnScrollIndex.value,
            col - columnSizes.value!.frozenCount,
            gridScrollAreaWidth.value
          )
          firstVisibleColumnScrollIndex.value = newColumn;
          domHorizontalScroll.value!.scroll(newColumn);
        }
      }
    }

    function handleSetFormView(rowData, column) {
      if (column) {
        openReferenceForm(unref(rowData), column, conid.value, database.value);
      } else {
        openPrimaryKeyForm(unref(rowData), display.value?.baseTable, conid.value, database.value);
      }
    }

    function handleGridMouseDown(event) {
      if (event.target.closest('.buttonLike')) return;
      if (event.target.closest('.resizeHandleControl')) return;
      if (event.target.closest('.collapseButtonMarker')) return;
      if (event.target.closest('.showFormButtonMarker')) return;
      if (event.target.closest('input')) return;
      shiftDragStartCell.value = null
      // event.target.closest('table').focus();
      event.preventDefault();
      if (domFocusField.value) domFocusField.value.focus();
      const cell = cellFromEvent(event);
      if (event.button == 2) {
        if (cell && !cellIsSelected(cell[0], cell[1], selectedCells.value)) {
          selectedCells.value = [cell];
        }
        return;
      }
      const autofill = event.target.closest('div.autofillHandleMarker');
      if (autofill) {
        autofillDragStartCell.value = cell;
      } else {
        const oldCurrentCell = currentCell.value
        currentCell.value = cell;

        if (isCtrlOrCommandKey(event)) {
          if (isRegularCell(cell)) {
            if (selectedCells.value.find(x => x[0] == cell[0] && x[1] == cell[1])) {
              selectedCells.value = selectedCells.value.filter(x => x[0] != cell[0] || x[1] != cell[1]);
            } else {
              selectedCells.value = [...selectedCells.value, cell];
            }
          }
        } else if (event.shiftKey) {
          selectedCells.value = getCellRange(oldCurrentCell, cell);
        } else {
          selectedCells.value = getCellRange(cell, cell);
          dragStartCell.value = cell;

          if (isRegularCell(cell) && !isEqual(cell, inplaceEditorState.value.cell) && isEqual(cell, oldCurrentCell)) {
            if (!showMultilineCellEditorConditional(cell)) {
              dispatchInsplaceEditor({type: 'show', cell, selectAll: true});
            }
          } else if (!isEqual(cell, inplaceEditorState.value.cell)) {
            dispatchInsplaceEditor({type: 'close'});
          }
        }
      }
      if (display.value && display.value.focusedColumns) display.value.focusColumns(null)
    }

    function handleGridMouseMove(event) {
      if (autofillDragStartCell.value) {
        const cell = cellFromEvent(event)
        if (isRegularCell(cell) && (cell[0] == autofillDragStartCell.value[0] || cell[1] == autofillDragStartCell.value[1])) {
          const autoFillStart = [selectedCells.value[0][0], min(selectedCells.value.map(x => x[1]))];
          // @ts-ignore
          autofillSelectedCells.value = getCellRange(autoFillStart, cell);
        }
      } else if (dragStartCell.value) {
        const cell = cellFromEvent(event);
        currentCell.value = cell;
        selectedCells.value = getCellRange(dragStartCell.value!, cell);
      }
    }

    function handleGridMouseUp(event) {
      if (dragStartCell.value) {
        const cell = cellFromEvent(event);
        currentCell.value = cell;
        selectedCells.value = getCellRange(dragStartCell.value!, cell);
        dragStartCell.value = null;
      }
      if (autofillDragStartCell.value) {
        const currentRowNumber = currentCell.value[0];
        if (isNumber(currentRowNumber)) {
          const rowIndexes = uniq((autofillSelectedCells.value || []).map(x => x[0])).filter(x => x != currentRowNumber);
          const colNames = selectedCells.value.map(cell => realColumnUniqueNames.value[cell[1]!]);
          const changeObject = pick(grider.value?.getRowData(currentRowNumber), colNames);
          grider.value?.beginUpdate();
          for (const index of rowIndexes) grider.value?.updateRow(index, changeObject);
          grider.value?.endUpdate();
        }

        autofillDragStartCell.value = null;
        autofillSelectedCells.value = [];
        selectedCells.value = autofillSelectedCells.value;
      }
    }

    function updateHorizontalColumnIndex(x) {
      firstVisibleColumnScrollIndex.value = x
    }

    function updateVerticalRowIndex(y) {
      firstVisibleRowScrollIndex.value = y
    }

    return {
      container,
      domFocusField,
      domHorizontalScroll,
      domVerticalScroll,
      ...toRefs(props),
      errorMessage,
      selectedCellsInfo,
      columns,
      columnSizes,
      headerColWidth,
      rowHeight,
      currentCell,
      autofillSelectedCells,
      selectedCells,
      autofillMarkerCell,
      getFilterType,
      handleGridWheel,
      updateCollapsedLeftColumn,
      filterCellsForRow,
      filterCellForRow,
      maxScrollColumn,
      gridScrollAreaWidth,
      shouldShowHorizontalScroll,
      visibleRowCountUpperBound,
      visibleRowCountLowerBound,
      visibleRealColumns,
      containerWidth,
      containerHeight,
      inplaceEditorState,
      dispatchInsplaceEditor,
      firstVisibleRowScrollIndex,
      firstVisibleColumnScrollIndex,
      handleGridKeyDown,
      handleSetFormView,
      handleGridMouseDown,
      handleGridMouseMove,
      handleGridMouseUp,
      updateHorizontalColumnIndex,
      updateVerticalRowIndex,
      griders,
      handleContext,
      handleGridDoubleClick,
      hasSelectedRows,
      handleCommitChanges,
      handleDeleteSelectedRows,
      handleInsertNewRow,
      handleDiscardAllChanges,
    }
  }
})
</script>

<style scoped>
.container {
  position: absolute;
  left: 0;
  top: 0;
  right: 0;
  bottom: 0;
  user-select: none;
  overflow: hidden;
}

.table {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 20px;
  right: 20px; /* 为垂直滚动条留出空间 */
  overflow: auto;
  overflow-y: auto;
  border-collapse: collapse;
  outline: none;
  /* 确保滚动条可见 */
  scrollbar-width: thin;
  scrollbar-color: var(--theme-border) transparent;
  /* 确保表格内容可以超出容器宽度 */
  min-width: 100%;
}

/* 当表格宽度超过容器时，强制显示水平滚动条 */
.table.force-horizontal-scroll {
  overflow-x: scroll;
}

/* Webkit 浏览器滚动条样式 */
.table::-webkit-scrollbar {
  width: 12px;
  height: 12px;
}

.table::-webkit-scrollbar-track {
  background: var(--theme-bg-0);
}

.table::-webkit-scrollbar-thumb {
  background: var(--theme-border);
  border-radius: 6px;
  border: 2px solid var(--theme-bg-0);
}

.table::-webkit-scrollbar-thumb:hover {
  background: var(--theme-font-3);
}

.table::-webkit-scrollbar-corner {
  background: var(--theme-bg-0);
}

.header-cell {
  border: 1px solid var(--theme-border);
  text-align: left;
  padding: 0;
  margin: 0;
  background-color: var(--theme-bg-1);
  overflow: hidden;
}

.filter-cell {
  text-align: left;
  overflow: hidden;
  margin: 0;
  padding: 0;
}

.focus-field {
  position: absolute;
  left: -1000px;
  top: -1000px;
}

.row-count-label {
  position: absolute;
  background-color: var(--theme-bg-2);
  right: 40px;
  bottom: 20px;
}

.edit-actions {
  position: absolute;
  left: 6px;
  bottom: 20px;
  display: inline-flex;
  gap: 6px;
  z-index: 20;
}
</style>

