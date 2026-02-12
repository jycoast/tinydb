import { useLocaleStore } from "/@/store/modules/locale"

function isMac() {
  // @ts-ignore
  const platform = navigator?.platform || navigator?.userAgentData?.platform || "unknown"
  return platform.toUpperCase().indexOf("MAC") >= 0
}

export function formatKeyText(keyText: string): string {
  if (isMac()) {
    return keyText
      .replace("CtrlOrCommand+", "⌘ ")
      .replace("Shift+", "⇧ ")
      .replace("Alt+", "⌥ ")
      .replace("Command+", "⌘ ")
      .replace("Ctrl+", "⌃ ")
      .replace("Backspace", "⌫ ")
  }
  return keyText.replace("CtrlOrCommand+", "Ctrl+")
}

export function setSelectedTabFunc(files, tabid) {
  return [
    ...(files || []).filter(x => x.tabid != tabid).map(x => ({ ...x, selected: false })),
    ...(files || []).filter(x => x.tabid == tabid).map(x => ({ ...x, selected: true })),
  ]
}

export function setSelectedTab(tabid) {
  const locale = useLocaleStore()
  locale.updateOpenedTabs(tabs => setSelectedTabFunc(tabs, tabid))
}
