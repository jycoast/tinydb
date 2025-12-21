<template>
  <div ref="node" class="main" @scroll="handleScroll">
    <div :style="`height: ${contentSize}px`">&nbsp;</div>
  </div>
</template>

<script lang="ts">
import {computed, defineComponent, PropType, ref, toRefs, unref, watch} from 'vue'

export default defineComponent({
  name: 'VerticalScrollBar',
  props: {
    viewportRatio: {
      type: Number as PropType<number>,
      default: 0.5
    },
    minimum: {
      type: Number as PropType<number>
    },
    maximum: {
      type: Number as PropType<number>
    }
  },
  emits: ['scroll'],
  setup(props, {emit}) {
    const {viewportRatio, minimum, maximum} = toRefs(props)
    const node = ref<Nullable<HTMLElement>>(null)
    const height = ref(0)
    const contentSize = computed(() => Math.round(height.value / viewportRatio.value))

    watch(() => [viewportRatio.value, minimum.value, maximum.value], () => {
      height.value = node.value ? node.value.clientHeight : 0
    })

    function handleScroll() {
      const position = node.value!.scrollTop
      const ratio = position / (contentSize.value - height.value);
      if (ratio < 0) return 0
      const res = ratio * (maximum.value! - minimum.value! + 1) + minimum.value!
      emit('scroll', Math.floor(res + 0.3))
    }

    function scroll(value) {
      const position01 = (unref(value) - minimum.value!) / (maximum.value! - minimum.value! + 1);
      const position = position01 * (contentSize.value - height.value);
      if (node.value) node.value.scrollTop = Math.floor(position)
    }

    return {
      node,
      viewportRatio,
      minimum,
      maximum,
      handleScroll,
      contentSize,
      scroll,
    }
  }
})
</script>

<style scoped>
.main {
  overflow-y: auto;
  overflow-x: hidden;
  width: 20px;
  position: absolute;
  right: 0px;
  bottom: 16px;
  top: 0;
  /* 确保滚动条可见 */
  scrollbar-width: thin;
  scrollbar-color: var(--theme-border) transparent;
  z-index: 10;
}

/* Webkit 浏览器滚动条样式 */
.main::-webkit-scrollbar {
  width: 12px;
}

.main::-webkit-scrollbar-track {
  background: var(--theme-bg-0);
}

.main::-webkit-scrollbar-thumb {
  background: var(--theme-border);
  border-radius: 6px;
  border: 2px solid var(--theme-bg-0);
}

.main::-webkit-scrollbar-thumb:hover {
  background: var(--theme-font-3);
}
</style>
