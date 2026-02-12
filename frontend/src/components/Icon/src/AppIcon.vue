<template>
  <el-icon
    :class="[padLeft && 'pad-left', padRight && 'pad-right', colorClass, isLoading && 'is-loading']"
    :size="size"
    :title="title"
    :style="style"
    @click="handleClick"
  >
    <component :is="iconComponent" v-if="iconComponent" />
  </el-icon>
</template>

<script lang="ts">
import { defineComponent, computed, PropType } from 'vue'
import {
  Loading,
  Close,
  Lock,
  Connection,
  User,
  Clock,
  Document,
  ArrowRight,
  Monitor,
  Brush,
  DataBoard,
  CircleCheck,
  CircleClose,
  Link,
  Tickets,
  Grid,
  Folder,
} from '@element-plus/icons-vue'

const iconMap: Record<string, any> = {
  'icon loading': Loading,
  'icon close': Close,
  'icon lock': Lock,
  'icon database': DataBoard,
  'icon palette': Brush,
  'icon server': Monitor,
  'icon account': User,
  'icon disconnected': Connection,
  'icon version': Tickets,
  'icon history': Clock,
  'icon menu-right': ArrowRight,
  'icon query': Document,
  'icon new-connection': Link,
  'img ok-inv': CircleCheck,
  'img error-inv': CircleClose,
  'img server': Monitor,
  'img database': DataBoard,
  'img table': Grid,
  'img folder': Folder,
}

export default defineComponent({
  name: 'AppIcon',
  props: {
    icon: { type: String as PropType<string> },
    title: { type: String as PropType<string> },
    padLeft: { type: [String, Boolean] as PropType<string | boolean> },
    padRight: { type: [String, Boolean] as PropType<string | boolean> },
    size: { type: [Number, String], default: 16 },
    style: { type: [String, Object] as PropType<string | object> },
  },
  emits: ['click'],
  setup(props, { emit }) {
    const iconComponent = computed(() => iconMap[props.icon || ''] || Document)
    const isLoading = computed(() => props.icon === 'icon loading')

    const colorClass = computed(() => {
      if (!props.icon) return ''
      if (props.icon === 'img ok-inv') return 'el-icon-success'
      if (props.icon === 'img error-inv') return 'el-icon-danger'
      return ''
    })

    const handleClick = () => emit('click')

    return { iconComponent, colorClass, handleClick }
  },
})
</script>

<style scoped>
.pad-left {
  margin-left: 0.25rem;
}
.pad-right {
  margin-right: 0.25rem;
}
.el-icon-success {
  color: var(--el-color-success);
}
.el-icon-danger {
  color: var(--el-color-danger);
}
.is-loading {
  animation: rotating 1.5s linear infinite;
}
@keyframes rotating {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>
