<template>
  <a-typography-link :href="href || undefined" @click="handleClick">
    <slot></slot>
  </a-typography-link>
</template>

<script lang="ts">
  import {defineComponent, PropType} from 'vue'
  import {Typography} from 'ant-design-vue'

  export default defineComponent({
    name: "Link",
    components: {
      ATypographyLink: Typography.Link
    },
    props: {
      href: {
        type: String as PropType<string>,
      },
    },
    emits: ['click'],
    setup(props, {emit}) {
      const handleClick = (e: Event) => {
        if (!props.href) {
          e.preventDefault()
        }
        emit('click', e)
      }
      return {
        handleClick
      }
    }
  })
</script>

