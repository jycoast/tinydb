<template>
  <div class="cm-root" :style="{ width: managerSize ? `${managerSize}px` : '100%' }">
    <div class="cm-toolbar">
      <ASpace :size="6">
        <AInput
          v-model:value="filter"
          allowClear
          size="small"
          placeholder="Search connection or database"
        />
        <ATooltip v-if="isDynamicStructure && !isJsonView" title="Add">
          <AButton size="small" type="text" @click="showModal">Add</AButton>
        </ATooltip>
        <ATooltip title="Hide all columns">
          <AButton size="small" type="text" @click="hideAllColumns">Hide</AButton>
        </ATooltip>
        <ATooltip title="Show all columns">
          <AButton size="small" type="text" @click="showAllColumns">Show</AButton>
        </ATooltip>
      </ASpace>
    </div>

    <div class="cm-list">
      <input
        type="text"
        class="focus-field"
        ref="domFocusField"
        @keydown="handleKeyDown"
        @copy="copyToClipboard"
      />

      <ColumnManagerRow
        v-for="column in items"
        :display="display"
        :column="column"
        :isJsonView="isJsonView"
        :conid="conid"
        :database="database"
        :isSelected="selectedColumns.includes(column.uniqueName) || currentColumnUniqueName == column.uniqueName"
        @dispatchClick="() => handleClick(column)"
        @dispatchMousemove="(e) => handleMousemove(e, column)"
        @dispatchMousedown="() => handleMousedown(column)"
        @dispatchMouseup="() => handleMouseup(column)"
        @setVisibility="(e) => handleSetVisibility(e, column)"
      />
    </div>
  </div>
</template>

<script lang="ts">
import {computed, defineComponent, PropType, ref, toRefs, unref} from 'vue'
import {findIndex, range} from 'lodash-es'
import ColumnManagerRow from '/@/components/DataGrid/ColumnManagerRow.vue'
import keycodes from '/@/second/utility/keycodes'
import {GridDisplay} from '/@/second/tinydb-datalib'
import {filterName} from '/@/second/tinydb-tools'
import {copyTextToClipboard} from '/@/second/utility/clipboard'

import {Button, Input, Space, Tooltip} from 'ant-design-vue'

export default defineComponent({
  name: "ColumnManager",
  components: {
    ColumnManagerRow,
    [Button.name]: Button,
    [Input.name]: Input,
    [Space.name]: Space,
    [Tooltip.name]: Tooltip,
  },
  props: {
    managerSize: {
      type: Number as PropType<number>,
    },
    display: {
      type: Object as PropType<GridDisplay>
    },
    isJsonView: {
      type: Boolean as PropType<boolean>,
      default: false
    },
    isDynamicStructure: {
      type: Boolean as PropType<boolean>,
      default: false
    },
    conid: {
      type: String as PropType<string>
    },
    database: {
      type: String as PropType<string>
    }
  },
  setup(props) {
    const {managerSize, isJsonView, display, conid, database} = toRefs(props)
    const filter = ref<Nullable<string>>(null)
    const domFocusField = ref<Nullable<HTMLElement>>(null)
    const currentColumnUniqueName = ref<Nullable<string>>(null)
    const dragStartColumnIndex = ref<Nullable<number>>(null)

    let shiftOriginColumnIndex: Nullable<number> = null

    const selectedColumns = ref<string[]>([])

    const items = computed(() => display.value
      ? display.value?.getColumns(filter.value)?.filter(column => filterName(filter.value!, column.columnName))
      : [])

    function showModal() {
    }

    function selectColumnIndexCore(index, e) {
      const uniqueName = items.value[index].uniqueName;
      if (e.shiftKey) {
        const curIndex = findIndex(items.value, x => x.uniqueName == currentColumnUniqueName.value);
        if (curIndex >= 0 && shiftOriginColumnIndex == null) shiftOriginColumnIndex = curIndex;

        selectedColumns.value = range(
          Math.min(shiftOriginColumnIndex!, index),
          Math.max(shiftOriginColumnIndex!, index) + 1
        ).map(i => items[i].uniqueName);
      } else {
        selectedColumns.value = [uniqueName];
        shiftOriginColumnIndex = null;
      }

      currentColumnUniqueName.value = uniqueName;
      if (!isJsonView.value) {
        display.value && display.value.focusColumns(selectedColumns.value);
      }
    }

    function selectColumnIndex(index, e) {
      if (index >= 0 && index < items.value.length) {
        selectColumnIndexCore(index, e);
        return;
      }
      if (items.value.length == 0) {
        return;
      }
      if (index < 0) {
        selectColumnIndexCore(0, e);
        return;
      } else if (index >= items.value.length) {
        selectColumnIndexCore(items.value.length - 1, e);
        return;
      }
    }

    function setSelectedColumns(value: string[]) {
      selectedColumns.value = value
      if (value.length > 0) {
        currentColumnUniqueName.value = <string>value[0]
      }
    }

    function moveIndex(indexFunc, e) {
      const index = findIndex(items.value, x => x.uniqueName == currentColumnUniqueName.value);
      if (index >= 0) {
        selectColumnIndex(indexFunc(index), e);
      }
    }

    function handleKeyDown(e) {
      if (e.keyCode == keycodes.upArrow) moveIndex(i => i - 1, e);
      else if (e.keyCode == keycodes.downArrow) moveIndex(i => i + 1, e);
      else if (e.keyCode == keycodes.home) moveIndex(() => 0, e);
      else if (e.keyCode == keycodes.end) moveIndex(() => items.value.length - 1, e);
      else if (e.keyCode == keycodes.pageUp) moveIndex(i => i - 10, e);
      else if (e.keyCode == keycodes.pageDown) moveIndex(i => i + 10, e);
      else if (e.keyCode == keycodes.space) {
        let checked: Nullable<boolean> = null;
        for (const name of selectedColumns.value) {
          const column = items.value.find(x => x.uniqueName == name);
          if (column) {
            if (checked == null) checked = !column.isChecked
            display.value!.setColumnVisibility(column.uniquePath, checked);
          }
        }
      }
    }

    function copyToClipboard() {
      copyTextToClipboard(selectedColumns.value.join('\r\n'))
    }

    function handleClick(column) {
      if (domFocusField.value) domFocusField.value.focus()
      selectedColumns.value = [column.uniqueName]
      currentColumnUniqueName.value = column.uniqueName
    }

    function handleMousemove(e, column) {
      if (e.buttons == 1 && dragStartColumnIndex.value != null && dragStartColumnIndex.value >= 0) {
        const index = findIndex(items.value, x => x.uniqueName == column.uniqueName)
        if (index >= 0) {
          selectedColumns.value = range(
            Math.min(dragStartColumnIndex.value, index),
            Math.max(dragStartColumnIndex.value, index) + 1
          ).map(i => items.value[i].uniqueName)
          currentColumnUniqueName.value = column.uniqueName
          if (!isJsonView.value) {
            display.value!.focusColumns([currentColumnUniqueName.value!, ...selectedColumns.value])
          }
        }
      }
    }

    function handleMousedown(column) {
      dragStartColumnIndex.value = findIndex(items.value, x => x.uniqueName == column.uniqueName)
      selectedColumns.value = [column.uniqueName]
      if (domFocusField.value) domFocusField.value.focus()
      currentColumnUniqueName.value = column.uniqueName
      if (!isJsonView.value) {
        display.value!.focusColumns(selectedColumns.value)
      }
    }

    function handleMouseup() {
      if (domFocusField.value) domFocusField.value.focus()
    }

    function handleSetVisibility(e, column) {
      if (selectedColumns.value && selectedColumns.value.includes(column.uniqueName)) {
        for (const name of selectedColumns.value) {
          const column = items.value.find(x => x.uniqueName == name);
          if (unref(column)) {
            display.value?.setColumnVisibility(unref(column)!.uniquePath, e)
          }
        }
      }
    }

    function hideAllColumns() {
      display.value && display.value.hideAllColumns()
    }

    function showAllColumns() {
      display.value && display.value.showAllColumns()
    }

    return {
      items,
      isJsonView,
      display,
      filter,
      domFocusField,
      conid,
      database,
      managerSize,
      selectedColumns,
      currentColumnUniqueName,
      copyToClipboard,
      showModal,
      setSelectedColumns,
      handleKeyDown,
      hideAllColumns,
      showAllColumns,
      handleClick,
      handleMousemove,
      handleMousedown,
      handleMouseup,
      handleSetVisibility
    }
  }
})
</script>

<style scoped>
.cm-root {
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.cm-toolbar {
  display: flex;
  align-items: center;
  padding: 6px 6px 8px;
  border-bottom: 1px solid var(--theme-border);
}

.cm-list {
  flex: 1;
  min-height: 0;
  overflow: auto;
}

.focus-field {
  position: absolute;
  left: -1000px;
  top: -1000px;
}
</style>
