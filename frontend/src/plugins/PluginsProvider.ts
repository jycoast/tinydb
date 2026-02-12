import {isEmpty, keys, pick} from 'lodash-es'
import {useInstalledPlugins} from '/@/api/bridge'
import {useBootstrapStore} from "/@/store/modules/bootstrap"
import {ref, watch} from 'vue'
import {ExtensionsDirectory} from "/@/types/extensions";
import mysql from './tinydb-plugin-mysql/index.js'
import mongo from './tinydb-plugin-mongo/index.js'

const plugins = {
  mysql,
  mongo
}

export default function initPluginsProvider() {
  const installedPlugins = ref()
  const bootstrap = useBootstrapStore()
  let pluginsDict = {}

  // 立即调用，不等待 onMounted
  useInstalledPlugins({}, installedPlugins)

  watch(() => installedPlugins.value, () => {
    loadPlugins(pluginsDict, installedPlugins.value, bootstrap)
      .then(newPlugins => {
        if (!isEmpty(newPlugins)) {
          pluginsDict = pick(
            {...pluginsDict, ...(newPlugins as object)},
            installedPlugins.value.map(y => y.name)
          )
        }
      })
      .then(() => {
        bootstrap.setExtensions(
          buildExtensions(buildPlugins(installedPlugins.value))
        )
      })
  }, { immediate: true })

  function buildPlugins(installedPlugins) {
    return (installedPlugins || [])
      .map(manifest => ({
        packageName: manifest.name,
        manifest,
        content: pluginsDict[manifest.name],
      }))
      .filter(x => x.content)
  }
}

async function loadPlugins(pluginsDict, installedPlugins, bootstrap) {
  const newPlugins = {}
  
  console.log('Loading plugins, installedPlugins:', installedPlugins);
  
  // 如果没有安装的插件，直接设置为已加载
  if (!installedPlugins || installedPlugins.length === 0) {
    console.log('No plugins installed, setting loaded to true');
    bootstrap.setLoadingPluginStore({
      loaded: true,
      loadingPackageName: null
    })
    return newPlugins
  }

  for (const installed of installedPlugins) {
    if (!keys(pluginsDict).includes(installed.name)) {
      console.log('Loading plugin:', installed.name);
      bootstrap.setLoadingPluginStore({
        loaded: false,
        loadingPackageName: installed.name
      })

      try {
        //这种方法开发环境可以，编译后无法访问。
        // const defaultFrontend = await import(`./tinydb-plugin-${installed.name}`)
        const defaultFrontend = await plugins[installed.name]
        newPlugins[installed.name] = defaultFrontend ?? {}
        console.log('Plugin loaded:', installed.name, defaultFrontend);
      } catch (err) {
        console.error('Error loading plugin:', installed.name, err);
        newPlugins[installed.name] = {}
      }
    }
  }

  // 确保在所有情况下都设置 loaded 为 true
  console.log('All plugins loaded, setting loaded to true');
  bootstrap.setLoadingPluginStore({
    loaded: true,
    loadingPackageName: null
  })

  return newPlugins
}

function buildDrivers(plugins) {
  const res = [];
  for (const {content} of plugins) {
    if (content.drivers) { // @ts-ignore
      res.push(...content.drivers);
    }
  }
  return res;
}

function buildExtensions(plugins): ExtensionsDirectory {
  return {
    plugins,
    drivers: buildDrivers(plugins),
  }
}
