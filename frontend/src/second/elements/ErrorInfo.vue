<template>
  <a-alert
    v-if="isSmall"
    :message="message || 'Unknown error'"
    type="error"
    size="small"
    :show-icon="false"
    class="error-alert-small"
  />
  <a-alert
    v-else
    :message="message || 'Unknown error'"
    type="error"
    :show-icon="true"
    :class="alignTop ? 'error-alert-top' : 'error-alert'"
  />
</template>

<script lang="ts">
  import {defineComponent, PropType} from 'vue'
  import {Alert} from 'ant-design-vue'

  export default defineComponent({
    name: "ErrorInfo",
    components: {
      AAlert: Alert
    },
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

