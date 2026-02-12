<template>
  <ConfigProvider :locale="getAntdLocale">
    <AppProvider>
      <DataGridRowHeightMeter />
      <RouterView />
    </AppProvider>
  </ConfigProvider>
</template>

<script lang="ts" setup>
import {ConfigProvider} from 'ant-design-vue';
import {AppProvider} from '/@/components/Application';
import {useLocale} from '/@/locales/useLocale';
import {onMounted, ref, watchEffect} from 'vue'
import {storeToRefs} from 'pinia'
import {connectionListApi, subscribeConnectionPingers} from "/@/api"
import dispatchRuntimeEvent from "/@/logics/tinydbRuntime"
import initPluginsProvider from "/@/plugins/PluginsProvider"
import {setAppLoaded} from '/@/utils/tinydb/appLoadManager'
import {useBootstrapStore} from "/@/store/modules/bootstrap"
import DataGridRowHeightMeter from "/@/components/DataGrid/DataGridRowHeightMeter.vue"

let loadedApi = ref(false)
const {getAntdLocale} = useLocale()
const bootstrap = useBootstrapStore()
const {loadingPluginStore} = storeToRefs(bootstrap)

initPluginsProvider()

function loadApi() {
  const tryLoadApi = async () => {
    try {
      if (!window["go"]) {
        setTimeout(tryLoadApi, 500)
        return
      }
      const connections = await connectionListApi()
      if (connections != null) {
        loadedApi.value = true
        subscribeConnectionPingers()
      } else {
        setTimeout(tryLoadApi, 1000)
      }
    } catch {
      setTimeout(tryLoadApi, 1000)
    }
  }
  tryLoadApi()
}

watchEffect(() => {
  if (loadedApi.value && loadingPluginStore.value.loaded) {
    setAppLoaded()
    document.querySelector(".app-loading")?.remove()
  }
})

onMounted(() => {
  loadApi()
  document.getElementById("starting_dbgate_zero")?.remove()
  setTimeout(() => {
    try {
      dispatchRuntimeEvent()
    } catch (e) {
      console.warn("dispatchRuntimeEvent failed", e)
    }
  }, 0)
})
</script>
