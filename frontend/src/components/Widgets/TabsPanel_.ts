import {findLastIndex} from 'lodash-es'
import {useLocaleStore} from "/@/store/modules/locale"
import getConnectionLabel from '/@/utils/tinydb/getConnectionLabel'
import {getOpenedTabs} from '/@/store/modules/locale'
import {ElMessageBox} from 'element-plus'

function allowCloseTabs(tabs) {
  if (!tabs || tabs.length == 0) return Promise.resolve(true)
  return ElMessageBox.confirm(
    `当前有 ${tabs.length} 个未保存的标签页，关闭后未保存内容将丢失。是否继续？`,
    '关闭未保存的标签页？',
    {confirmButtonText: '关闭', cancelButtonText: '取消'}
  ).then(() => true).catch(() => false)
}

const closeTabFunc = closeCondition => tabid => {
  const locale = useLocaleStore()
  locale.updateOpenedTabs(files => {
    const active = files.find(x => x.tabid == tabid);
    if (!active) return files;
    const newFiles = files.map(x => ({
      ...x,
      closedTime: x.closedTime || (closeCondition(x, active) ? new Date().getTime() : undefined),
    }));

    if (newFiles.find(x => x.selected && x.closedTime == null)) {
      return newFiles;
    }

    // @ts-ignore
    const selectedIndex = findLastIndex(newFiles, x => x.closedTime == null)
    return newFiles.map((x, index) => ({
      ...x,
      selected: index == selectedIndex,
    }))
  })
}

export const closeMultipleTabs = (closeCondition, deleteFromHistory = false) => {
  const locale = useLocaleStore()
  locale.updateOpenedTabs(files => {
    const newFiles = deleteFromHistory
      ? files.filter(x => !closeCondition(x))
      : files.map(x => ({
        ...x,
        closedTime: x.closedTime || (closeCondition(x) ? new Date().getTime() : undefined),
      }));

    if (newFiles.find(x => x.selected && x.closedTime == null)) {
      return newFiles;
    }

    // @ts-ignore
    const selectedIndex = findLastIndex(newFiles, x => x.closedTime == null)
    return newFiles.map((x, index) => ({
      ...x,
      selected: index == selectedIndex,
    }))
  })
}

export const closeTab = closeTabFunc((x, active) => x.tabid == active.tabid);

export const closeAll = async () => {
  const closeCandidates = getOpenedTabs()!.filter(x => x.unsaved && x.closedTime == null)
  if (!(await allowCloseTabs(closeCandidates))) return;

  const locale = useLocaleStore()
  const closedTime = new Date().getTime()
  locale.updateOpenedTabs(tabs => {
    const newTabs = (tabs || []).map(tab => ({
      ...tab,
      closedTime: tab.closedTime || (tab.closedTime == null ? closedTime : tab.closedTime),
      selected: false,
    }))
    return newTabs
  })
}

export const closeOthers = closeTabFunc((x, active) => x.tabid != active.tabid)

export function getTabDbName(tab, connectionList) {
  if (tab.tabComponent == 'ConnectionTab') return '连接';
  if (tab.props && tab.props.conid && tab.props.database) return tab.props.database;
  if (tab.props && tab.props.conid) {
    const connection = connectionList?.find(x => x._id == tab.props.conid);
    if (connection) return getConnectionLabel(connection, {allowExplicitDatabase: false});
    return '???';
  }
  if (tab.props && tab.props.archiveFolder) return tab.props.archiveFolder;
  return '(no DB)';
}

