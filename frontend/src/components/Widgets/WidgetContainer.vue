<template>
  <DatabaseWidget :hidden="selectedWidget != 'database'"/>
</template>

<script setup lang="ts">
import DatabaseWidget from "./DatabaseWidget.vue"
import {useLocaleStore} from "/@/store/modules/locale"
import {storeToRefs} from "pinia"

const localeStore = useLocaleStore()
const {selectedWidget} = storeToRefs(localeStore)
</script>
