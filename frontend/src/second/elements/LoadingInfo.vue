<template>
  <div v-if="wrapper" class="wrapper">
    <a-spin :tip="message" size="large">
      <div class="spin-content"></div>
    </a-spin>
  </div>
  <a-spin v-else :tip="message" size="default" class="loading-spin">
    <template #indicator>
      <LoadingOutlined :style="{ fontSize: 20 }" spin />
    </template>
  </a-spin>
</template>

<script lang="ts">
  import {defineComponent, PropType} from 'vue'
  import {Spin} from 'ant-design-vue'
  import {LoadingOutlined} from '@ant-design/icons-vue'

  export default defineComponent({
    name: "LoadingInfo",
    components: {
      ASpin: Spin,
      LoadingOutlined
    },
    props: {
      message: {
        type: String as PropType<string>,
      },
      wrapper: {
        type: Boolean as PropType<boolean>,
        default: false
      }
    },
  })
</script>

<style scoped>
  .loading-spin {
    margin-right: 10px;
  }

  .wrapper {
    position: absolute;
    left: 0;
    top: 0;
    right: 0;
    bottom: 0;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .spin-content {
    min-height: 200px;
  }
</style>

