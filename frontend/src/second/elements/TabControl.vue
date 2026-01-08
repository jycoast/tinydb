<template>
  <div class="main" :class="flex1 && 'flex1'">
    <a-tabs
      v-model:activeKey="activeKey"
      type="card"
      :tabBarExtraContent="menu ? h(DropDownButton, { menu }) : undefined"
      class="tab-control-tabs"
    >
      <a-tab-pane
        v-for="(tab, index) in tabs"
        :key="String(index)"
        :tab="tab.label"
      >
        <div
          class="container"
          :class="[isInline && 'isInline']"
          :style="containerMaxWidth ? `max-width: ${containerMaxWidth}` : undefined"
        >
          <component
            :is="tab.component"
            v-bind="{...tab.props}"
            :tabControlHiddenTab="index != activeKeyIndex"
          />
        </div>
      </a-tab-pane>
    </a-tabs>
  </div>
</template>

<script lang="ts">
import {Component, defineComponent, PropType, toRefs, ref, computed, h, watch} from "vue"
import DropDownButton from '/@/second/buttons/DropDownButton'
import {compact} from "lodash-es";
import {Tabs} from "ant-design-vue";

const TabPane = Tabs.TabPane

interface TabDef {
  label: string;
  slot?: number;
  component?: string | Component;
  props?: any;
}

export default defineComponent({
  name: 'TabControl',
  components: {
    DropDownButton,
    ATabs: Tabs,
    ATabPane: TabPane,
  },
  props: {
    isInline: {
      type: Boolean as PropType<boolean>,
      default: false
    },
    tabs: {
      type: Array as PropType<TabDef[]>
    },
    value: {
      type: Number as PropType<number>,
      default: 0
    },
    menu: {
      type: Array as unknown as PropType<[]>,
    },
    containerMaxWidth: {
      type: String as PropType<string>
    },
    flex1: {
      type: Boolean as PropType<boolean>,
      default: true
    }
  },
  emits: ['update:value'],
  setup(props, {emit}) {
    const {isInline, tabs, value, menu, containerMaxWidth, flex1} = toRefs(props)

    const activeKey = ref(String(value.value || 0))
    const activeKeyIndex = computed(() => parseInt(activeKey.value))

    watch(() => value.value, (val) => {
      if (val !== undefined) activeKey.value = String(val)
    }, {immediate: true})

    watch(activeKey, (val) => {
      emit('update:value', parseInt(val))
    })

    return {
      h,
      isInline,
      menu,
      containerMaxWidth,
      flex1,
      tabs: computed(() => compact(tabs.value || [])),
      activeKey,
      activeKeyIndex,
      DropDownButton
    }
  }
})
</script>

<style scoped>
.main {
  display: flex;
  flex-direction: column;
}

.tab-control-tabs {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.container {
  height: 100%;
}

</style>
