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
import {connectionListApi} from '/@/api/simpleApis'
import dispatchRuntimeEvent from "/@/api/event";
import initPluginsProvider from '/@/second/plugins/PluginsProvider'
import {subscribeConnectionPingers} from '/@/api/connectionsPinger'
import {setAppLoaded} from '/@/second/utility/appLoadManager'
import {useBootstrapStore} from "/@/store/modules/bootstrap"
import DataGridRowHeightMeter from '/@/second/datagrid/DataGridRowHeightMeter.vue'
// import 'dayjs/locale/zh-cn';

let loadedApi = ref(false)

// support Multi-language
const {getAntdLocale} = useLocale();

initPluginsProvider()

const bootstrap = useBootstrapStore()
const {loadingPluginStore} = storeToRefs(bootstrap)

async function loadApi() {
  try {
    // 等待 window.go 可用
    if (!window['go']) {
      console.log('Waiting for window.go to be available...');
      let waitCount = 0
      while (!window['go'] && waitCount < 50) {
        await new Promise(resolve => setTimeout(resolve, 100))
        waitCount++
      }
      if (!window['go']) {
        console.error('window.go is not available after 5 seconds');
        setTimeout(loadApi, 1000);
        return
      }
    }
    
    console.log('Loading API...');
    const connections = await connectionListApi()
    console.log('API response:', connections);
    if (connections !== undefined && connections !== null) {
      loadedApi.value = true
      console.log('API loaded successfully');
      subscribeConnectionPingers()
    } else {
      console.log('API returned empty result, trying again in 1s');
      setTimeout(loadApi, 1000);
    }
  } catch (err) {
    console.error('Error calling API, trying again in 1s', err);
    setTimeout(loadApi, 1000);
  }
}

watchEffect(() => {
  console.log('Loading state:', {
    loadedApi: loadedApi.value,
    pluginLoaded: loadingPluginStore.value.loaded,
    loadingPackageName: loadingPluginStore.value.loadingPackageName
  });
  
  if (loadedApi.value && loadingPluginStore.value.loaded) {
    console.log('App loaded, removing loading animation');
    setAppLoaded();
    // 移除加载动画
    const loadingEl = document.querySelector('.app-loading');
    if (loadingEl) {
      loadingEl.remove();
    }
  }
})

onMounted(() => {
  loadApi()
  const removed = document.getElementById('starting_dbgate_zero');
  if (removed) removed.remove();

  // Wails runtime events are provided via /wailsjs/runtime; window.runtime may be undefined in some environments.
  // If we don't register these handlers, backend SqlSelect waits forever for 'handleSqlSelectReturn'.
  try {
    dispatchRuntimeEvent()
  } catch (e) {
    console.warn('dispatchRuntimeEvent failed (non-wails environment?)', e)
  }
})
</script>
