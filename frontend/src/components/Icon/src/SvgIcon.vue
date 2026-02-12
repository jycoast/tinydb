<template>
  <svg
    :class="['vben-svg-icon', $attrs.class, spin && 'svg-icon-spin']"
    :style="getStyle"
    aria-hidden="true"
  >
    <use :xlink:href="symbolId" />
  </svg>
</template>
<script lang="ts" setup>
import type { CSSProperties } from 'vue';
import { computed } from 'vue';

const props = defineProps({
  prefix: { type: String, default: 'icon' },
  name: { type: String, required: true },
  size: { type: [Number, String], default: 16 },
  spin: { type: Boolean, default: false },
})

const symbolId = computed(() => `#${props.prefix}-${props.name}`)

const getStyle = computed((): CSSProperties => {
  const s = `${String(props.size).replace('px', '')}px`
  return { width: s, height: s }
})
</script>
<style scoped>
.vben-svg-icon {
  display: inline-block;
  overflow: hidden;
  vertical-align: -0.15em;
  fill: currentColor;
}

.svg-icon-spin {
  animation: loadingCircle 1s infinite linear;
}
</style>
