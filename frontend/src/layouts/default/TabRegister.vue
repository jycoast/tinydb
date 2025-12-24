<template>
  <TabContent
    :key="`${tabid}-${getTabKey(tabid)}`"
    v-for="tabid in tabids"
    :tabComponent="mountedTabs[tabid].tabComponent"
    v-bind="tabPropsMap[tabid] || {}"
    :tabid="tabid"
    :tabVisible="tabid == (selectedTab && selectedTab.tabid)"
  />
</template>

<script lang="ts">
import {computed, defineComponent, ref, watchEffect} from 'vue'
import {storeToRefs} from "pinia"
import {difference, keys, pickBy} from 'lodash-es'
import {useLocaleStore} from '/@/store/modules/locale'
import tabs from '/@/second/tabs'
import TabContent from './TabContent.vue'
import {TabDefinition} from "/@/store/modules/bootstrap"

function createTabComponent(selectedTab) {
  const tabComponent = tabs[selectedTab.tabComponent]?.default;
  if (tabComponent) {
    return {
      tabComponent,
      props: selectedTab && selectedTab.props,
    };
  }
  return null
}

export default defineComponent({
  name: "TabRegister",
  components: {
    TabContent
  },
  setup() {
    const localeStore = useLocaleStore()
    const {openedTabs} = storeToRefs(localeStore)
    const mountedTabs = ref({})
    const selectedTab = computed(() => (openedTabs.value as TabDefinition[]).find(x => x.selected && x.closedTime == null))

    // 使用 computed 创建响应式的 props map，确保 props 变化时能正确更新
    const tabPropsMap = computed(() => {
      const propsMap: Record<string, any> = {}
      const openTabs = (openedTabs.value as TabDefinition[]).filter(x => x.closedTime == null)
      for (const tab of openTabs) {
        if (tab.tabid) {
          // 确保 props 存在，如果不存在则使用空对象
          const props = tab.props || {}
          // 创建新的对象引用，确保 Vue 能检测到变化
          // 特别确保 pureName, conid, database 等关键属性存在
          propsMap[tab.tabid] = { ...props }
          
          // 调试：检查关键属性是否存在（包括空字符串的情况）
          const tabComponentName = typeof tab.tabComponent === 'string' ? tab.tabComponent : (tab.tabComponent as any)?.name || ''
          if (tabComponentName === 'TableDataTab') {
            const hasPureName = props.pureName && String(props.pureName).trim() !== ''
            if (!hasPureName) {
              console.warn(`[TabRegister] TableDataTab ${tab.tabid} missing or empty pureName:`, {
                tabid: tab.tabid,
                title: tab.title,
                props: props,
                pureName: props.pureName,
                pureNameType: typeof props.pureName,
                fullTab: tab,
                openedTabsSnapshot: JSON.parse(JSON.stringify(openedTabs.value))
              })
            } else {
              console.log(`[TabRegister] TableDataTab ${tab.tabid} props OK:`, {
                tabid: tab.tabid,
                conid: props.conid,
                database: props.database,
                schemaName: props.schemaName,
                pureName: props.pureName
              })
            }
          }
        }
      }
      return propsMap
    })

    // 生成 tab 的唯一 key，用于强制重新渲染当 props 变化时
    function getTabKey(tabid: string) {
      const props = tabPropsMap.value[tabid]
      if (!props) return ''
      // 只使用关键属性生成 key，避免性能问题
      const keyProps = {
        conid: props.conid,
        database: props.database,
        schemaName: props.schemaName,
        pureName: props.pureName,
      }
      return `${keyProps.conid || ''}-${keyProps.database || ''}-${keyProps.schemaName || ''}-${keyProps.pureName || ''}`
    }

    watchEffect(() => {
      const openTabs = (openedTabs.value as TabDefinition[]).filter(x => x.closedTime == null)
      const openTabIds = openTabs.map(t => t.tabid).filter(Boolean)
      
      // 清理已关闭的 tabs
      const mountedTabIds = keys(mountedTabs.value)
      const closedTabIds = difference(mountedTabIds, openTabIds)
      if (closedTabIds.length > 0) {
        mountedTabs.value = pickBy(mountedTabs.value, (_, k) => openTabIds.includes(k))
      }

      // 为所有打开的 tabs 创建或更新组件
      for (const tab of openTabs) {
        if (!tab.tabid) continue
        
        if (!mountedTabs.value[tab.tabid]) {
          // 创建新 tab
          const newTab = createTabComponent(tab);
          if (newTab) {
            // 确保 props 存在且有效
            if (tab.props) {
              newTab.props = { ...tab.props }
            }
            mountedTabs.value = {
              ...mountedTabs.value,
              [tab.tabid]: newTab
            }
          }
        } else {
          // 更新已存在 tab 的 props，确保 props 同步（特别是 pureName 等关键属性）
          const existingTab = mountedTabs.value[tab.tabid]
          if (existingTab && tab.props) {
            // 检查 props 是否真的发生了变化，避免不必要的更新
            const propsChanged = JSON.stringify(existingTab.props) !== JSON.stringify(tab.props)
            if (propsChanged) {
              // 完全替换 props，确保所有属性都更新（特别是 pureName）
              existingTab.props = { ...tab.props }
            }
          }
        }
      }
    })

    const tabIds = computed(() => keys(mountedTabs.value))

    return {
      tabids: tabIds,
      mountedTabs,
      selectedTab,
      tabPropsMap,
      getTabKey,
    }
  }
})
</script>
