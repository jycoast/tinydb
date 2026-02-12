import {storeToRefs} from "pinia"
import openNewTab from "/@/utils/tinydb/openNewTab"
import {useBootstrapStore, useBootstrapStoreWithOut} from "/@/store/modules/bootstrap"

export interface SubCommand {
  text: string
  onClick: Function
}

export interface GlobalCommand {
  id: string
  category: string
  isGroupCommand?: boolean
  name: string
  text?: string
  keyText?: string
  keyTextFromGroup?: string
  group?: string
  getSubCommands?: () => SubCommand[]
  onClick?: Function
  testEnabled?: () => boolean
  icon?: string
  toolbar?: boolean
  enabled?: boolean
  showDisabled?: boolean
  toolbarName?: string
  menuName?: string
  toolbarOrder?: number
  disableHandleKeyText?: string
  isRelatedToTab?: boolean
  systemCommand?: boolean
}

export async function invalidateCommands() {
  const bootstrap = useBootstrapStoreWithOut()
  bootstrap.updateCommands((dct) => {
    let res: Record<string, GlobalCommand> | null = null
    for (const command of Object.values(dct) as GlobalCommand[]) {
      if (command.isGroupCommand) continue
      const {testEnabled} = command
      let enabled = command.enabled
      if (testEnabled) enabled = testEnabled()
      if (enabled != command.enabled) {
        if (!res) res = {...dct}
        if (res) {
          res[command.id].enabled = enabled;
        }
      }
    }
    if (res) {
      const values = Object.values(res) as GlobalCommand[]
      for (const cmd of values) {
        if (!cmd.isGroupCommand) continue
        const groupSources = values.filter((x) => x.group == cmd.group && !x.isGroupCommand && x.enabled)
        cmd.enabled = groupSources.length > 0
      }
    }
    return res || dct
  })
}

function invalidateCommandDefinitions(bootstrap: ReturnType<typeof useBootstrapStore>) {
  bootstrap.updateCommands((dct) => {
    const res = {...dct}
    const values = Object.values(res) as GlobalCommand[]
    for (const cmd of values) {
      if (!cmd.isGroupCommand) continue
      const groupSources = values.filter((x) => x.group == cmd.group && !x.isGroupCommand)
      for (const src of groupSources) {
        src.keyTextFromGroup = cmd.keyText
      }
    }
    return res
  })
}

export function registerCommand(command: GlobalCommand) {
  const {testEnabled} = command
  const bootstrap = useBootstrapStore()
  bootstrap.updateCommands((x) => {
    if (x[command.id]) return x
    return {
      ...x,
      [command.id]: {
        text: `${command.category}: ${command.name}`,
        ...command,
        enabled: testEnabled ? testEnabled() : true,
      },
    }
  })
  invalidateCommandDefinitions(bootstrap)
}

export function runCommand(id: string) {
  const bootstrap = useBootstrapStore()
  const {currentDatabase} = storeToRefs(bootstrap)

  switch (id) {
    case "new.query":
      openNewTab(
        {
          title: "新建查询#",
          icon: "icon query",
          tabComponent: "SqlQueryTab",
          props: {noPrefill: true},
          selected: true,
          busy: false,
        },
        undefined,
        {forceNewTab: true}
      )
      break
    case "new.connection":
      window.dispatchEvent(new CustomEvent("open-new-connection-modal"))
      break
    case "new.table":
      if (currentDatabase.value?.connection?._id && currentDatabase.value?.name) {
        window.dispatchEvent(
          new CustomEvent("open-create-table-modal", {
            detail: {
              conid: currentDatabase.value.connection._id,
              database: currentDatabase.value.name,
            },
          })
        )
      } else {
        alert("请先选择数据库")
      }
      break
    case "new.collection":
      if (currentDatabase.value?.connection?._id && currentDatabase.value?.name) {
        window.dispatchEvent(
          new CustomEvent("open-create-table-modal", {
            detail: {
              conid: currentDatabase.value.connection._id,
              database: currentDatabase.value.name,
            },
          })
        )
      } else {
        alert("请先选择数据库")
      }
      break
    case "query.history":
      openNewTab({
        title: "查询历史",
        icon: "icon query",
        tabComponent: "QueryHistoryTab",
        props: {},
        selected: true,
        busy: false,
      })
      break
    default:
      break
  }
}

export function registerDefaultCommands() {
  registerCommand({
    id: "new.connection",
    toolbar: true,
    icon: "icon new-connection",
    toolbarName: "新建连接",
    category: "New",
    toolbarOrder: 1,
    name: "Connection",
    onClick: () => runCommand("new.connection"),
  })
}
