<template>
  <div class="mm-root" :style="{ width: managerSize ? `${managerSize}px` : '100%' }">
    <div class="mm-toolbar">
      <ASpace :size="6">
        <AInput v-model:value="filter" allowClear size="small" placeholder="Search macros"/>
      </ASpace>
    </div>

    <div class="mm-list">
      <AppObjectList
        :list="macrosList"
        :filter="filter"
        :module="macroAppObject"
        :groupFunc="data => data.group"
      />
    </div>
  </div>
</template>

<script lang="ts">
import {defineComponent, PropType, ref, toRefs, computed} from 'vue'
import {sortBy} from 'lodash-es'
import MacroAppObject from './MacroAppObject'
import AppObjectList from '/@/components/AppObject/AppObjectList'
import {GridDisplay} from '/@/lib/tinydb-datalib'
import macros from './macros'

import {Input, Space} from 'ant-design-vue'
export default defineComponent({
  name: 'MacroManager',
  components: {
    MacroAppObject,
    AppObjectList,
    [Input.name]: Input,
    [Space.name]: Space,
  },
  props: {
    managerSize: {
      type: Number as PropType<number>,
    },
    display: {
      type: Object as PropType<GridDisplay>
    },
    macroCondition: {
      type: Function as PropType<(value: any) => void>
    }
  },
  setup(props) {
    const {managerSize, display, macroCondition} = toRefs(props)

    const filter = ref('')

    const macrosList = computed(() =>
      sortBy(macros, 'title').filter(x => (macroCondition.value ? macroCondition.value(x) : true)))

    return {
      filter,
      managerSize,
      display,
      macroCondition,
      macrosList,
      macroAppObject: MacroAppObject
    }
  }
})
</script>

<style scoped>
.mm-root {
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.mm-toolbar {
  display: flex;
  align-items: center;
  padding: 6px 6px 8px;
  border-bottom: 1px solid var(--theme-border);
}

.mm-list {
  flex: 1;
  min-height: 0;
  overflow: auto;
}
</style>
