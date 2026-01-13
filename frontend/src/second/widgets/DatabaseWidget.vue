<template>
  <div v-show="!hidden" class="dbw-root">
    <DatabaseOverview />
  </div>
</template>

<script lang="ts">
import {defineComponent, PropType, toRef} from 'vue'
import { DatabaseOverview } from '/@/views'

export default defineComponent({
  name: "DatabaseWidget",
  props: {
    hidden: {
      type: Boolean as PropType<boolean>,
      default: false,
    }
  },
  components: { DatabaseOverview },
  setup(props) {
    return {
      hidden: toRef(props, 'hidden'),
    }
  }
})
</script>

<style scoped>
.dbw-root {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  background: var(--theme-bg-0);
  overflow: hidden;
}
</style>
