<template>
  <DatabaseWidget :hidden="selectedWidget != 'database'"/>
</template>

<script lang="ts">
import DatabaseWidget from './DatabaseWidget.vue'
import {defineComponent} from 'vue'
import {useLocaleStore} from '/@/store/modules/locale'
import {storeToRefs} from "pinia"
export default defineComponent({
  setup() {
    const localeStore = useLocaleStore()
    const {selectedWidget} = storeToRefs(localeStore)
    return {
      selectedWidget
    }
  },
  components: {
    DatabaseWidget,
  }
})
</script>
