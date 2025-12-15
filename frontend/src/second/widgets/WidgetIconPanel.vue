<template>
  <div class="main">
    <div class="wrapper" :class="{'selected':item.name === selectedWidget}"
         v-for="item in widgets"
         @click="handleChangeWidget(item.name)">
      <FontIcon :icon="item.icon" :title="item.title"/>
    </div>

    <div class="flex1">&nbsp;</div>

    <div class="wrapper" @click="handleSettingsMenu" ref="domSettings">
      <FontIcon icon="icon settings"/>
    </div>
  </div>
</template>

<script lang="ts">
import {reactive, ref, nextTick} from 'vue';
import {storeToRefs} from 'pinia'
import FontIcon from '/@/second/icons/FontIcon.vue'
import {useLocaleStore} from '/@/store/modules/locale'
import {useBootstrapStore} from '/@/store/modules/bootstrap'

export default {
  setup() {
    const widgets = reactive([
      {
        icon: 'icon database',
        name: 'database',
        title: 'Database connections',
      },
      // {
      //   icon: 'fa-table',
      //   name: 'table',
      // },
      {
        icon: 'icon file',
        name: 'file',
        title: 'Favorites & Saved files',
      },
      {
        icon: 'icon history',
        name: 'history',
        title: 'Query history & Closed tabs',
      },
      {
        icon: 'icon archive',
        name: 'archive',
        title: 'Archive (saved tabular data)',
      },
      {
        icon: 'icon plugin',
        name: 'plugins',
        title: 'Extensions & Plugins',
      },
      {
        icon: 'icon cell-data',
        name: 'cell-data',
        title: 'Selected cell data detail view',
      },
      {
        icon: 'icon app',
        name: 'app',
        title: 'Application layers',
      },
      // {
      //   icon: 'icon settings',
      //   name: 'settings',
      // },
      // {
      //   icon: 'fa-check',
      //   name: 'settings',
      // },
    ])

    const localeStore = useLocaleStore()
    const bootstrap = useBootstrapStore()
    const {selectedWidget} = storeToRefs(localeStore)
    const domSettings = ref<Nullable<HTMLElement>>(null)

    async function handleSettingsMenu() {
      await nextTick()
      const rect = domSettings.value!.getBoundingClientRect();
      const left = rect.right
      const top = rect.bottom
      const items = [{command: 'settings.show'}, {command: 'theme.changeTheme'}, {command: 'settings.commands'}]
      bootstrap.setCurrentDropDownMenu({left, top, items})
    }

    function handleChangeWidget(name) {
      localeStore.setSelectedWidget(name === selectedWidget.value ? null : name)
    }

    return {
      widgets,
      selectedWidget,
      domSettings,
      handleSettingsMenu,
      handleChangeWidget
    };
  },
  components: {FontIcon},
};
</script>

<style scoped>
.wrapper {
  font-size: 20pt;
  height: 56px;
  min-height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--theme-font-inv-3);
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.wrapper:hover {
  color: var(--theme-font-inv-1);
  background: var(--theme-bg-inv-2);
}

.wrapper.selected {
  color: var(--theme-font-inv-1);
  background: var(--theme-bg-inv-3);
}

.wrapper.selected::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 3px;
  background: var(--theme-bg-selected-point);
}

.main {
  display: flex;
  flex: 1;
  flex-direction: column;
  padding: 4px 0;
}
</style>


