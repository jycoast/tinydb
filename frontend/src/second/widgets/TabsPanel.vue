<template>
  <div class="root">
    <div class="tabs" ref="domTabs" @wheel.prevent="handleTabsWheel">
      <div class="db-wrapper" v-for="tabGroup in groupedTabs">
        <div class="db-group">
          <div class="file-tab-item"
               v-for="tab in tabGroup.tabs"
               :id="`file-tab-item-${tab.tabid}`"
               :class="{selected: draggingTab || draggingDbGroup ? tab.tabid == draggingTabTarget?.tabid : tab.selected}"
               @click="handleTabClick($event, tab.tabid)"
               @mouseup="handleMouseUp($event, tab.tabid)"
               @contextmenu="handleContextTab($event, tab)"
               :draggable="true"
               @dragstart="(e) => handleDragstart(e, tab)"
               @dragenter="(e) => draggingTabTarget = tab"
               @dragover.prevent
               @drop="(e) => {
                 if (draggingTab) {
                   dragDropTabs([draggingTab], [tab])
                 }
                 if (draggingDbGroup) {
                   dragDropTabs(draggingDbGroup.tabs, [tab])
                 }
               }"
               @dragend="(e) => {
                 draggingTab = null
                 draggingTabTarget = null
               }"
          >
            <FontIcon :icon="tab.busy ? 'icon loading' : tab.icon"/>
            <span class="file-name">{{ tab.title }}</span>
            <span class="close-button tabCloseButton" @click="closeTab(tab.tabid)"> <FontIcon
              icon="icon close"/></span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import {computed, defineComponent, ref, unref} from 'vue'
import {findIndex, max, min} from 'lodash-es'
import {storeToRefs} from 'pinia'
import FontIcon from '/@/second/icons/FontIcon.vue'
import {useLocaleStore} from '/@/store/modules/locale'
import {useBootstrapStore} from '/@/store/modules/bootstrap'
import {getConnectionInfo} from '/@/api/bridge'
import {getTabDbKey, groupTabs, sortTabs} from '/@/second/utility/openNewTab'
import {setSelectedTab} from '/@/second/utility/common'
import {useContextMenu} from '/@/hooks/web/useContextMenu'
import {buildUUID} from '/@/utils/uuid'
import localforage from 'localforage'
import {message} from 'ant-design-vue'
import {
  closeMultipleTabs,
  closeTab,
  closeAll,
  closeOthers,
  closeWithOtherDb,
  closeWithSameDb,
  getDbIcon,
  getTabDbName
} from './TabsPanel_'
import {useClusterApiStore} from '/@/store/modules/clusterApi'
import {IPinnedDatabasesItem} from '/@/second/typings/types/standard'

export default defineComponent({
  name: "TabsPanel",
  components: {FontIcon},
  setup() {
    let domTabs = ref<Nullable<HTMLElement>>(null)
    const localeStore = useLocaleStore()
    const {openedTabs, pinnedDatabases, pinnedTables} = storeToRefs(localeStore)
    const bootstrap = useBootstrapStore()
    const {currentDatabase} = storeToRefs(bootstrap)

    const clusterApi = useClusterApiStore()
    const {connectionList} = storeToRefs(clusterApi)

    const draggingTab = ref(null)
    const draggingTabTarget = ref(null)
    const draggingDbGroup = ref(null)
    const draggingDbGroupTarget = ref(null)

    const handleTabsWheel = async (e) => {
      if (!e.shiftKey) {
        domTabs.value!.scrollBy({top: 0, left: e.deltaY < 0 ? -150 : 150, behavior: 'smooth'})
      }
    }

    const currentDbKey = computed(() => {
      return currentDatabase.value && currentDatabase.value.name && currentDatabase.value.connection
        ? `database://${currentDatabase.value.name}-${currentDatabase.value.connection._id}`
        : currentDatabase.value && currentDatabase.value.connection
          ? `server://${currentDatabase.value.connection._id}`
          : '_no'
    })

    const tabsWithDb = computed(() => {
      return openedTabs.value
        .filter(x => !x.closedTime)
        .map(tab => ({
          ...tab,
          tabDbName: getTabDbName(tab, connectionList.value),
          tabDbKey: getTabDbKey(tab),
        }))
    })

    const groupedTabs = computed(() => groupTabs(tabsWithDb.value))

    const handleTabClick = (e, tabid) => {
      if (e.target.closest('.tabCloseButton')) {
        return;
      }
      setSelectedTab(tabid);
    }

    const handleMouseUp = (e, tabid) => {
      if (e.button == 1) {
        e.preventDefault();
        closeTab(tabid)
      }
    }

    const handleSetDb = async props => {
      const {conid, database} = props || {};
      if (conid) {
        const connection = await getConnectionInfo({conid, database})
        if (connection) {
          bootstrap.setCurrentDatabase({
            connection: unref(connection),
            name: unref(database)
          } as Nullable<IPinnedDatabasesItem>)
          // $currentDatabase = { connection, name: database };
          return;
        }
      }
      bootstrap.setCurrentDatabase(null)
    }

    const [createContextMenu] = useContextMenu()

    function isSamePinnedTable(a: any, b: any) {
      return (
        a?.conid == b?.conid &&
        a?.database == b?.database &&
        a?.objectTypeField == b?.objectTypeField &&
        a?.pureName == b?.pureName &&
        a?.schemaName == b?.schemaName
      )
    }

    async function duplicateTab(tab: any) {
      const oldTabid = tab?.tabid
      if (!oldTabid) return

      const newTabid = buildUUID()

      // Copy persisted per-tab data if present (best-effort)
      try {
        const sqlKey = `sql_query_${oldTabid}`
        const sqlVal = localStorage.getItem(sqlKey)
        if (sqlVal != null) localStorage.setItem(`sql_query_${newTabid}`, sqlVal)

        // Copy any tabdata_*_${oldTabid} entries
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i)
          if (!k) continue
          if (k.startsWith('tabdata_') && k.endsWith(`_${oldTabid}`)) {
            const v = localStorage.getItem(k)
            if (v != null) {
              const nk = k.replace(new RegExp(`_${oldTabid}$`), `_${newTabid}`)
              localStorage.setItem(nk, v)
            }
          }
        }

        const editorKey = `tabdata_editor_${oldTabid}`
        const editorVal = await localforage.getItem(editorKey)
        if (editorVal != null) {
          await localforage.setItem(`tabdata_editor_${newTabid}`, editorVal)
        }
      } catch {
        // ignore persistence copy errors
      }

      // Create a readable unique title
      const openTitles = (openedTabs.value || []).filter(x => !x.closedTime).map(x => x.title)
      const base = `${tab.title} (copy)`
      let title = base
      let n = 2
      while (openTitles.includes(title)) {
        title = `${base} ${n}`
        n += 1
      }

      localeStore.updateOpenedTabs((files: any[]) => {
        const open = (files || []).filter(x => x.closedTime == null)
        const ordered = sortTabs(open)
        const idx = findIndex(ordered, x => x.tabid == oldTabid)
        const insertAt = idx >= 0 ? idx + 1 : ordered.length

        const newItem = {
          ...tab,
          tabid: newTabid,
          title,
          selected: true,
          closedTime: null,
          busy: false,
        }

        const orderedWithNew = [
          ...ordered.slice(0, insertAt),
          newItem,
          ...ordered.slice(insertAt),
        ]

        return (files || []).map(x => {
          const newIndex = findIndex(orderedWithNew, y => y.tabid == x.tabid)
          if (newIndex >= 0) {
            return {
              ...x,
              selected: false,
              tabOrder: newIndex + 1,
            }
          }
          return {
            ...x,
            selected: false,
          }
        }).concat([{
          ...newItem,
          tabOrder: findIndex(orderedWithNew, y => y.tabid == newTabid) + 1,
        }])
      })

      message.success('已复制标签页')
    }

    function toggleFavorite(tab: any) {
      const data = tab?.appObjectData
      if (data?.objectTypeField) {
        const exists = (pinnedTables.value || []).some(x => isSamePinnedTable(x, data))
        if (exists) {
          localeStore.updatePinnedTables(list => (list || []).filter(x => !isSamePinnedTable(x, data)))
          message.success('已从收藏移除')
        } else {
          localeStore.updatePinnedTables(list => [...(list || []), data])
          message.success('已加入收藏')
        }
        return
      }

      // fallback: allow pin database if possible (best-effort)
      const conid = tab?.props?.conid
      const database = tab?.props?.database
      if (conid && database) {
        getConnectionInfo({conid, database}).then((conn: any) => {
          if (!conn) {
            message.error('无法获取连接信息，收藏失败')
            return
          }
          const exists = (pinnedDatabases.value || []).some(x => x?.name == database && x?.connection?._id == conn._id)
          if (exists) {
            localeStore.updatePinnedDatabases(list => (list || []).filter(x => !(x?.name == database && x?.connection?._id == conn._id)))
            message.success('已从收藏移除')
          } else {
            localeStore.updatePinnedDatabases(list => [
              ...(list || []),
              {connection: conn, name: database, title: database} as any,
            ])
            message.success('已加入收藏')
          }
        }).catch((e) => message.error(`收藏失败：${e?.message || e}`))
        return
      }

      message.warning('该标签页暂不支持加入收藏')
    }

    function handleContextTabs(e: MouseEvent, tabs: any[]) {
      createContextMenu({
        event: e,
        items: getDatabaseContextMenu(tabs),
      });
    }

    function getDatabaseContextMenu(tabs) {
      const {tabid, props} = tabs[0];
      const {conid, database} = props || {};

      return [
        conid &&
        database && [
          {
            text: `Close tabs with DB ${database}`,
            onClick: () => closeWithSameDb(tabid),
          },
          {
            text: `Close tabs with other DB than ${database}`,
            onClick: () => closeWithOtherDb(tabid),
          },
        ],
      ];
    }

    function handleContextTab(e: MouseEvent, tab: any) {
      createContextMenu({
        event: e,
        items: getContextMenu(tab),
      })
    }
    
    function getContextMenu(tab: any) {
      const { tabid, props, tabComponent, appObject, appObjectData } = tab;
      const isPinned = appObjectData?.objectTypeField
        ? (pinnedTables.value || []).some(x => isSamePinnedTable(x, appObjectData))
        : false

      return [
        {
          text: 'Close',
          onClick: () => closeTab(tabid),
        },
        {
          text: 'Close all',
          onClick: closeAll,
        },
        {
          text: 'Close others',
          onClick: () => closeOthers(tabid),
        },
        {
          text: 'Duplicate',
          onClick: () => duplicateTab(tab),
        },
        [
          { divider: true },
          {
            text: isPinned ? 'Remove from favorites' : 'Add to favorites',
            onClick: () => toggleFavorite(tab),
          },
        ],
        { divider: true },
      ];
    }

    async function handleDragstart(e, tab) {
      // WebView2/Firefox: ensure a drag payload exists, otherwise drop may never fire
      try {
        e?.dataTransfer?.setData('text/plain', String(tab?.tabid || 'tab'))
        e?.dataTransfer && (e.dataTransfer.effectAllowed = 'move')
      } catch {
        // ignore
      }
      draggingTab.value = tab
      setSelectedTab(tab.tabid)
    }

    function dragDropTabs(draggingTabs, targetTabs) {
      if (unref(draggingTabs).find(x => unref(targetTabs).find(y => x.tabid == y.tabid))) return;

      const items = sortTabs(unref(openedTabs).filter(x => x.closedTime == null))
      const dstIndexes = unref(targetTabs).map(targetTab => findIndex(items, x => x.tabid == targetTab.tabid))
      const dstIndexFirst = min(dstIndexes) as number;
      const dstIndexLast = max(dstIndexes) as number;
      const srcIndex = findIndex(items, x => x.tabid == unref(draggingTabs)[0].tabid);
      if (srcIndex < 0 || dstIndexFirst < 0 || dstIndexLast < 0) {
        console.warn('Drag tab index not found');
        return;
      }

      const newItems =
        dstIndexFirst < srcIndex
          ? [
            ...items.slice(0, dstIndexFirst),
            ...unref(draggingTabs),
            ...items.slice(dstIndexFirst).filter(x => !unref(draggingTabs).find(y => y.tabid == x.tabid)),
          ]
          : [
            ...items.slice(0, dstIndexLast + 1).filter(x => !unref(draggingTabs).find(y => y.tabid == x.tabid)),
            ...unref(draggingTabs),
            ...items.slice(dstIndexLast + 1),
          ]

      localeStore.updateOpenedTabs(tabs => {
        return tabs.map(x => {
          const index = findIndex(newItems, y => y.tabid == x.tabid)
          if (index >= 0) {
            return {
              ...x,
              tabOrder: index + 1,
            };
          }
          return x;
        })
      })
    }

    return {
      domTabs,
      connectionList,
      currentDbKey,
      groupedTabs,
      draggingTab,
      draggingTabTarget,
      draggingDbGroup,
      draggingDbGroupTarget,

      handleTabsWheel,
      handleTabClick,
      handleMouseUp,
      closeMultipleTabs,
      handleSetDb,
      dragDropTabs,
      handleDragstart,
      handleContextTab,
      closeTab,
    }
  },
})
</script>

<style scoped>
.root {
  position: relative;
  width: 100%;
  height: 100%;
  background: var(--theme-bg-1);
  display: flex;
  align-items: stretch;
  overflow: hidden;
  border-bottom: 1px solid var(--theme-border);
}

.tabs {
  height: 100%;
  display: flex;
  align-items: stretch;
  overflow-x: auto;
  overflow-y: hidden;
  position: relative;
  width: calc(100% - 40px);
  scrollbar-width: thin;
  scrollbar-color: var(--theme-border) transparent;
}

.tabs::-webkit-scrollbar {
  height: 4px;
}

.tabs::-webkit-scrollbar-track {
  background: transparent;
}

.tabs::-webkit-scrollbar-thumb {
  background: var(--theme-border);
  border-radius: 2px;
}

.tabs::-webkit-scrollbar-thumb:hover {
  background: var(--theme-font-3);
}

.db-group {
  display: flex;
  flex: 0 0 auto;
  align-items: stretch;
}

.db-wrapper {
  display: flex;
  flex-direction: row;
  align-items: stretch;
}

.file-tab-item {
  border-right: 1px solid var(--theme-border);
  padding: 0 12px;
  flex-shrink: 0;
  flex-grow: 0;
  min-width: 120px;
  max-width: 240px;
  display: flex;
  align-items: center;
  cursor: pointer;
  user-select: none;
  transition: all 0.2s ease;
  background: var(--theme-bg-1);
  position: relative;
}

.file-tab-item:hover {
  background: var(--theme-bg-hover);
}

.file-tab-item.selected {
  background-color: var(--theme-bg-0);
  z-index: 1;
}

.file-tab-item.selected::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: var(--theme-bg-selected-point);
}

.file-name {
  margin-left: 8px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex-grow: 1;
  font-size: 12px;
}

.close-button {
  margin-left: 8px;
  color: var(--theme-font-3);
  opacity: 0;
  transition: all 0.2s ease;
  padding: 2px;
  border-radius: 2px;
}

.file-tab-item:hover .close-button {
  opacity: 1;
}

.file-tab-item.selected .close-button {
  opacity: 1;
}

</style>
