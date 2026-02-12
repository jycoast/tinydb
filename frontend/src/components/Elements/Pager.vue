<template>
  <a-space class="pager-wrapper">
    <a-button size="small" @click="handleSkipMinus" :icon="h(LeftOutlined)" />
    <span class="label">Start:</span>
    <a-input-number
      size="small"
      v-model:value="skipRW"
      :min="0"
      :style="{ width: '100px' }"
      @blur="handleLoad"
      @pressEnter="handleLoad"
    />
    <span class="label">Rows:</span>
    <a-input-number
      size="small"
      v-model:value="limitRW"
      :min="1"
      :style="{ width: '100px' }"
      @blur="handleLoad"
      @pressEnter="handleLoad"
    />
    <a-button size="small" @click="handleSkipPlus" :icon="h(RightOutlined)" />
  </a-space>
</template>

<script lang="ts">
import {defineComponent, PropType, ref, toRefs, watch, h} from 'vue'
import {isNumber} from '/@/utils/is'
import {Button, InputNumber, Space} from 'ant-design-vue'
import {LeftOutlined, RightOutlined} from '@ant-design/icons-vue'

export default defineComponent({
  name: "Pager",
  components: {
    AButton: Button,
    AInputNumber: InputNumber,
    ASpace: Space,
    LeftOutlined,
    RightOutlined
  },
  props: {
    skip: {
      type: Number as PropType<number>,
    },
    limit: {
      type: Number as PropType<number>,
    }
  },
  emits: ['update:skip', 'update:limit', 'load'],
  setup(props, {emit}) {
    const {skip, limit} = toRefs(props)

    const skipRW = ref(skip?.value || 0)
    const limitRW = ref(limit?.value || 10)

    watch(() => skip?.value, (val) => {
      if (val !== undefined) skipRW.value = val
    }, {immediate: true})

    watch(() => limit?.value, (val) => {
      if (val !== undefined) limitRW.value = val
    }, {immediate: true})

    function handleSkipPlus() {
      if (isNumber(skipRW.value) && isNumber(limitRW.value)) {
        skipRW.value = parseInt(String(skipRW.value)) + parseInt(String(limitRW.value))
        if (skipRW.value < 0) skipRW.value = 0
        emit('update:skip', skipRW.value)
        emit('load')
      }
    }

    function handleSkipMinus() {
      if (isNumber(skipRW.value) && isNumber(limitRW.value)) {
        skipRW.value = parseInt(String(skipRW.value)) - parseInt(String(limitRW.value))
        if (skipRW.value < 0) skipRW.value = 0
        emit('update:skip', skipRW.value)
        emit('load')
      }
    }

    watch(() => skipRW.value, () => {
      if (isNumber(skipRW.value) && skipRW.value >= 0) emit('update:skip', skipRW.value)
    })
    watch(() => limitRW.value, () => {
      if (isNumber(limitRW.value) && limitRW.value >= 0) emit('update:limit', limitRW.value)
    })

    function handleLoad() {
      emit('load')
    }

    return {
      h,
      skipRW,
      limitRW,
      handleLoad,
      handleSkipPlus,
      handleSkipMinus,
      LeftOutlined,
      RightOutlined
    }
  }
})
</script>

<style scoped>
.pager-wrapper {
  display: flex;
  align-items: center;
}

.label {
  margin-left: 5px;
  margin-right: 5px;
}
</style>
