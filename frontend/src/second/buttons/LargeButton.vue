<template>
  <div
    class="button"
    @click="handleClick"
    :class="[disabled && 'disabled', fillHorizontal && 'fillHorizontal']">
    <div class="icon">
      <FontIcon :icon="icon"/>
    </div>
    <div class="inner">
      <slot></slot>
    </div>
  </div>
</template>

<script lang="ts">
import {defineComponent, PropType, toRef, toRefs} from 'vue'
import FontIcon from '/@/second/icons/FontIcon.vue'

export default defineComponent({
  name: "LargeButton",
  components: {
    FontIcon
  },
  props: {
    icon: {
      type: String as PropType<string>,
    },
    disabled: {
      type: Boolean as PropType<boolean>,
      default: false
    },
    fillHorizontal: {
      type: Boolean as PropType<boolean>,
      default: false
    },
  },
  emits: ['visible'],
  setup(props, {emit}) {
    const disabled = toRef(props, 'disabled')
    const handleClick = () => {
      if (!disabled.value) {
        emit('visible')
      }
    }

    return {
      handleClick,
      ...toRefs(props),
    }
  }
})
</script>

<style scoped>
.button {
  padding: 0 15px;
  color: var(--theme-font-1);
  border: 1px solid var(--theme-border);
  width: 120px;
  background-color: var(--theme-bg-1);
  cursor: pointer;
}

.icon {
  font-size: 30px;
  text-align: center;
}

.inner {
  text-align: center;
}
</style>
