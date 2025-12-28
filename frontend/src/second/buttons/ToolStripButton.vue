<template>
  <div class="button" :class="disabled && 'disabled'" :title="title">
    <div class="inner" :class="disabled && 'disabled'" @click="handleClick($event)">
      <span class="icon" :class="disabled && 'disabled'"><FontIcon :icon="icon"/></span>
      <slot></slot>
    </div>
  </div>
</template>

<script lang="ts">
import {defineComponent, PropType, toRef, toRefs} from 'vue'
import FontIcon from '/@/second/icons/FontIcon.vue'

export default defineComponent({
  name: "ToolStripButton",
  components: {
    FontIcon
  },
  props: {
    title: {
      type: String as PropType<string>
    },
    disabled: {
      type: Boolean as PropType<boolean>,
      default: false
    },
    icon: {
      type: String as PropType<string>
    }
  },
  emits: ['click'],
  setup(props, {emit}) {
    const disabled = toRef(props, 'disabled')

    function handleClick(e: Event) {
      if (disabled.value) return
      emit('click', {target: e.target})
    }

    return {
      ...toRefs(props),
      handleClick
    }
  }
})
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

.icon {
  margin-right: 5px;
  color: var(--theme-font-link);
}

.inner {
  white-space: nowrap;
  align-self: center;
  height: 24px;
  line-height: 22px;
  box-sizing: border-box;
  background: var(--theme-bg-0);
  border: 1px solid var(--theme-border);
  padding: 0 8px;
  border-radius: 6px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  transition: background-color 120ms ease, border-color 120ms ease, color 120ms ease;
}

</style>
