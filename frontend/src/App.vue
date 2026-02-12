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
import initPluginsProvider from '/@/plugins/PluginsProvider'
import {subscribeConnectionPingers} from '/@/api/connectionsPinger'
import {setAppLoaded} from '/@/utils/tinydb/appLoadManager'
import {useBootstrapStore} from "/@/store/modules/bootstrap"
import DataGridRowHeightMeter from '/@/components/DataGrid/DataGridRowHeightMeter.vue'
// import 'dayjs/locale/zh-cn';

let loadedApi = ref(false)

// support Multi-language
const {getAntdLocale} = useLocale();

initPluginsProvider()

const bootstrap = useBootstrapStore()
const {loadingPluginStore} = storeToRefs(bootstrap)

async function loadApi() {
  // 非阻塞方式：不等待 window.go，直接尝试调用 API
  // 如果 window.go 不可用，会在后台重试
  const tryLoadApi = async () => {
    try {
      // 快速检查 window.go 是否可用，不等待
      if (!window['go']) {
        // 不阻塞，延迟重试
        setTimeout(tryLoadApi, 500);
        return;
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
        setTimeout(tryLoadApi, 1000);
      }
    } catch (err) {
      console.error('Error calling API, trying again in 1s', err);
      setTimeout(tryLoadApi, 1000);
    }
  };
  
  // 立即尝试，不等待
  tryLoadApi();
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
  // 立即开始加载 API，不阻塞渲染
  loadApi()
  
  const removed = document.getElementById('starting_dbgate_zero');
  if (removed) removed.remove();

  // Wails runtime events are provided via /wailsjs/runtime; window.runtime may be undefined in some environments.
  // If we don't register these handlers, backend SqlSelect waits forever for 'handleSqlSelectReturn'.
  // 延迟执行，不阻塞初始渲染
  setTimeout(() => {
    try {
      dispatchRuntimeEvent()
    } catch (e) {
      console.warn('dispatchRuntimeEvent failed (non-wails environment?)', e)
    }
  }, 0);
})
</script>
