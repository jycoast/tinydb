import { Component, PropType } from "vue"
import { defineStore } from "pinia"
import { mapValues, uniq } from "lodash-es"
import { store } from "/@/store"
import { invalidateCommands } from "/@/commands"
import { IPinnedDatabasesItem } from "/@/types/standard"
import { ExtensionsDirectory } from "/@/types/extensions"
import { ContextMenuItem } from "/@/components/Modals"

interface IVariableBasic {
  openedConnections: string[]
  currentDatabase: Nullable<IPinnedDatabasesItem>
  extensions: Nullable<ExtensionsDirectory>
  currentDropDownMenu: Nullable<ICurrentDropDownMenu>
  commands: { [key in string]: any }
  commandsSettings: object
  visibleCommandPalette: Nullable<unknown>
  commandsCustomized: object
  loadingPluginStore: { loaded: boolean; loadingPackageName: Nullable<string> }
  connections: []
  databases: []
  openedSingleDatabaseConnections: string[]
  expandedConnections: string[]
}

export interface TabDefinition {
  title: string
  closedTime?: number
  icon: string
  props: any
  selected: boolean
  busy: boolean
  tabid: string
  tabComponent: PropType<string | Component>
  tabOrder?: number
  unsaved?: string
}

export interface ICurrentDropDownMenu {
  left: number
  top: number
  items: () => ContextMenuItem[]
  targetElement?: HTMLElement
}

export const useBootstrapStore = defineStore({
  id: "app-bootstrap",
  state: (): IVariableBasic => ({
    currentDatabase: null,
    openedConnections: [],
    openedSingleDatabaseConnections: [],
    expandedConnections: [],
    extensions: null,
    currentDropDownMenu: null,
    commands: {},
    commandsSettings: {},
    visibleCommandPalette: null,
    commandsCustomized: {},
    loadingPluginStore: {
      loaded: false,
      loadingPackageName: null,
    },
    connections: [],
    databases: [],
  }),
  getters: {
    getOpenedConnections(): string[] {
      return this.openedConnections
    },
    getCurrentDatabase(): Nullable<IPinnedDatabasesItem> {
      return this.currentDatabase
    },
    getCommandsCustomized(): any[] {
      return mapValues([this.commands, this.commandsSettings], (v, k) => ({
        // @ts-ignore
        ...v,
        ...this.commandsSettings[k],
      }))
    },
  },
  actions: {
    updateOpenedConnections(updater: (list: string[]) => string[]) {
      this.openedConnections = updater(this.openedConnections)
    },
    setCurrentDatabase(value: Nullable<IPinnedDatabasesItem>) {
      this.currentDatabase = value
      if (value?.connection?._id) {
        if (value?.connection?.singleDatabase) {
          this.openedSingleDatabaseConnections = uniq([...this.openedSingleDatabaseConnections, value?.connection?._id])
        } else {
          this.openedConnections = uniq([...this.openedConnections, value?.connection?._id])
          this.expandedConnections = uniq([...this.expandedConnections, value?.connection?._id])
        }
      }
    },
    setExtensions(value: ExtensionsDirectory) {
      this.extensions = value
    },
    setCurrentDropDownMenu(value: null | ICurrentDropDownMenu) {
      this.currentDropDownMenu = value
    },
    setVisibleCommandPalette(value: Nullable<unknown>) {
      this.visibleCommandPalette = value
    },
    setCommands(value: object) {
      this.commands = value
      this.commandsCustomized = derived(this.commands, this.commandsSettings)
    },
    updateCommands(updater) {
      this.commands = updater(this.commands)
    },
    setLoadingPluginStore(value: { loaded: boolean; loadingPackageName: Nullable<string> }) {
      this.loadingPluginStore = value
    },
    updateExpandedConnections(updater) {
      this.expandedConnections = updater(this.expandedConnections)
    },
    updateOpenedSingleDatabaseConnections(updater) {
      this.openedSingleDatabaseConnections = updater(this.openedSingleDatabaseConnections)
    },
  },
})

export function useBootstrapStoreWithOut() {
  return useBootstrapStore(store)
}

const derived = (commands, commandsSettings): object => {
  return mapValues(commands, (v, k) => ({
    ...v,
    ...commandsSettings[k],
  }))
}
