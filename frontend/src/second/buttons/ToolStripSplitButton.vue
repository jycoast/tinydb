<template>
  <div class="button" :class="disabled && 'disabled'" :title="title">
    <div class="inner" :class="disabled && 'disabled'">
      <div class="main" :class="disabled && 'disabled'" @click="handleClick">
        <span class="icon" :class="disabled && 'disabled'"><FontIcon :icon="icon"/></span>
        <slot/>
      </div>
      <span class="split-icon" :class="disabled && 'disabled'" @click="handleSplitClick">
        <FontIcon :icon="splitIcon"/></span>
    </div>
  </div>
</template>

<script lang="ts" setup>
import {defineEmits, defineProps, PropType, toRefs} from 'vue'
import FontIcon from '/@/second/icons/FontIcon.vue'

const props = defineProps({
  disabled: {
    type: Boolean as PropType<boolean>,
    default: false
  },
  icon: {
    type: String as PropType<Nullable<string>>,
  },
  title: {
    type: String as PropType<Nullable<string>>,
  },
  splitIcon: {
    type: String as PropType<string>,
    default: 'icon chevron-down'
  }
})

const {disabled, icon, title, splitIcon} = toRefs(props)

const emit = defineEmits(['childClick', 'splitclick'])

function handleClick(e) {
  if (disabled?.value) return;
  emit('childClick', {target: e.target})
}

function handleSplitClick(e) {
  if (disabled?.value) return;
  emit('splitclick', {target: e.target});
}
</script>

<style scoped>
.button {
  padding-left: 4px;
  padding-right: 4px;
  color: var(--theme-font-1);
  border: 0;
  align-self: stretch;
  display: flex;
  user-select: none;
}

.button.disabled {
  color: var(--theme-font-3);
}

.icon {
  margin-right: 5px;
  color: var(--theme-font-link);
}

.icon.disabled {
  color: var(--theme-font-3);
}

.inner {
  white-space: nowrap;
  align-self: center;
  cursor: pointer;
  display: flex;
  height: 24px;
  line-height: 22px;
  box-sizing: border-box;
  background: var(--theme-bg-0);
  border: 1px solid var(--theme-border);
  border-radius: 6px;
  overflow: hidden;
  transition: background-color 120ms ease, border-color 120ms ease, color 120ms ease;
}

.main {
  display: flex;
  align-items: center;
  padding: 0 6px 0 8px;
}

.main:hover:not(.disabled) {
  background: var(--theme-bg-hover);
}

.main:active:not(.disabled) {
  background: var(--theme-bg-2);
}

.split-icon {
  display: inline-flex;
  align-items: center;
  padding: 0 6px;
  color: var(--theme-font-link);
  border-left: 1px solid var(--theme-border);
}

.split-icon:hover:not(.disabled) {
  background: var(--theme-bg-hover);
}

.split-icon:active:not(.disabled) {
  background: var(--theme-bg-2);
}

.inner:hover:not(.disabled) {
  border-color: var(--theme-font-link);
}
</style>
