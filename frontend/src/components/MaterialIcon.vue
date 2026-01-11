<template>
  <span
    :class="[iconClass, customClass]"
    :style="iconStyle"
    :title="title"
    @click="handleClick"
  >
    {{ iconName }}
  </span>
</template>

<script lang="ts" setup>
import { computed, onMounted } from 'vue'
import { loadMaterialIcons, getMaterialIconName, getMaterialIconClass } from '/@/utils/materialIcons'

interface Props {
  icon: string
  size?: string | number
  color?: string
  title?: string
  customClass?: string
}

const props = withDefaults(defineProps<Props>(), {
  size: 24,
  color: undefined,
  title: undefined,
  customClass: ''
})

const emit = defineEmits<{
  click: [event: MouseEvent]
}>()

const iconName = computed(() => {
  const name = getMaterialIconName(props.icon)
  return name || ''
})

const iconClass = computed(() => {
  return getMaterialIconClass(props.icon)
})

const iconStyle = computed(() => {
  const style: Record<string, string> = {}
  if (props.size) {
    style.fontSize = typeof props.size === 'number' ? `${props.size}px` : props.size
  }
  if (props.color) {
    style.color = props.color
  }
  return style
})

const handleClick = (event: MouseEvent) => {
  emit('click', event)
}

onMounted(() => {
  // 按需加载图标
  if (iconName.value) {
    loadMaterialIcons([iconName.value])
  }
})
</script>

<style scoped>
.material-symbols-outlined,
.material-icons {
  font-family: 'Material Symbols Outlined', 'Material Icons';
  font-weight: normal;
  font-style: normal;
  font-size: 24px;
  line-height: 1;
  letter-spacing: normal;
  text-transform: none;
  display: inline-block;
  white-space: nowrap;
  word-wrap: normal;
  direction: ltr;
  -webkit-font-feature-settings: 'liga';
  -webkit-font-smoothing: antialiased;
  user-select: none;
  cursor: default;
}

.material-icons {
  font-family: 'Material Icons';
}
</style>

