<template>
  <el-alert
    v-if="isSmall"
    :title="message || 'Unknown error'"
    type="error"
    :show-icon="false"
    :closable="false"
    class="error-alert-small"
  />
  <el-alert
    v-else
    :title="message || 'Unknown error'"
    type="error"
    :show-icon="true"
    :closable="false"
    :class="alignTop ? 'error-alert-top' : 'error-alert'"
  />
</template>

<script lang="ts">
  import {defineComponent, PropType} from 'vue'

  export default defineComponent({
    name: "ErrorInfo",
    props: {
      message: {
        type: String as PropType<string>,
      },
      icon: {
        type: String as PropType<string>,
        default: 'img error'
      },
      isSmall: {
        type: Boolean as PropType<boolean>,
        default: false
      },
      alignTop: {
        type: Boolean as PropType<boolean>,
        default: false
      },
    },
  })
</script>

<style scoped>
  .error-alert {
    margin-right: 10px;
  }

  .error-alert-top {
    margin-right: 10px;
  }

  .error-alert-small {
    margin-right: 10px;
  }
</style>

