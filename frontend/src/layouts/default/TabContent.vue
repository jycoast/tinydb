<template>
  <div class="tab-content-host" :class="tabVisible ? 'tabVisible' : ''">
    <component :is="tabComponent" v-bind="$attrs" :tabid="tabid" :tabVisible="tabVisible"/>
  </div>
</template>

<script lang="ts">
import {Component, defineComponent, PropType, provide, ref, toRaw, toRef, watch} from 'vue'

export default defineComponent({
  name: 'TabContent',
  inheritAttrs: false,
  props: {
    tabVisible: {
      type: Boolean as PropType<boolean>,
    },
    tabid: {
      type: String as PropType<string>,
    },
    tabComponent: {
      type: [Object, String] as PropType<string | Component>,
    },
  },
  setup(props, { attrs }) {
    const tabComponent = toRaw(props.tabComponent)
    const tabVisible = toRef(props, 'tabVisible')
    const tabid = toRef(props, 'tabid')

    const tabVisibleStore = ref(tabVisible.value)

    provide('tabid', tabid)
    provide('tabVisible', tabVisibleStore)

    watch(() => tabVisible.value, () => {
      tabVisibleStore.value = tabVisible.value
    })

    return {
      tabVisible,
      tabComponent
    }
  }
})
</script>

<style scoped>
.tab-content-host {
  position: absolute;
  left: 0;
  top: 0;
  right: 0;
  bottom: 0;
  display: flex;
  width: 100%;
  height: 100%;
}

.tabVisible {
  visibility: visible;
  pointer-events: auto;
  z-index: 1;
}

.tab-content-host:not(.tabVisible) {
  visibility: hidden;
  pointer-events: none;
  z-index: 0;
}

/* 确保标签页内容不会遮挡顶部和底部 */
.tab-content-host {
  pointer-events: none;
}

.tab-content-host.tabVisible {
  pointer-events: auto;
}
</style>
