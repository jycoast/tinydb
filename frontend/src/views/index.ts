/**
 * Views 统一导出
 * 统一导出所有页面和布局组件，方便引用
 */

// 布局组件
export { default as DefaultLayout } from './layout/DefaultLayout.vue'
export { default as TitleBar } from './layout/TitleBar.vue'
export { default as MenuBar } from './layout/MenuBar.vue'
export { default as TabRegister } from './layout/TabRegister.vue'
export { default as TabContent } from './layout/TabContent.vue'

// Welcome
export { default as Welcome } from './Welcome/Welcome.vue'

// Connections
export { default as ConnectionList } from './Connections/ConnectionList.vue'
export { default as ConnectionNew } from './Connections/ConnectionNew.vue'
export { default as ConnectionEdit } from './Connections/ConnectionEdit.vue'

// Query
export { default as QueryEditor } from './Query/QueryEditor.vue'
export { default as QueryResult } from './Query/QueryResult.vue'
export { default as QueryHistory } from './Query/QueryHistory.vue'
export { default as SavedQueries } from './Query/SavedQueries.vue'

// Database
export { default as DatabaseOverview } from './Database/DatabaseOverview.vue'
export { default as TableStructure } from './Database/Table/TableStructure.vue'
export { default as TableData } from './Database/Table/TableData.vue'
export { default as TableDesign } from './Database/Table/TableDesign.vue'
export { default as ViewStructure } from './Database/View/ViewStructure.vue'
export { default as ViewData } from './Database/View/ViewData.vue'
export { default as ProcedureList } from './Database/Routine/ProcedureList.vue'
export { default as FunctionList } from './Database/Routine/FunctionList.vue'

// Server
export { default as ServerStatus } from './Server/ServerStatus.vue'
export { default as ServerVariables } from './Server/ServerVariables.vue'
export { default as ServerSummaryTab } from './Server/ServerSummaryTab.vue'

// Tools
export { default as DataExport } from './Tools/DataExport.vue'
export { default as DataImport } from './Tools/DataImport.vue'
export { default as DataTransfer } from './Tools/DataTransfer.vue'
export { default as ERDiagram } from './Tools/ERDiagram.vue'

// Settings
export { default as SettingsGeneral } from './Settings/General.vue'
export { default as SettingsAppearance } from './Settings/Appearance.vue'
export { default as SettingsConnectionDefaults } from './Settings/ConnectionDefaults.vue'
export { default as SettingsAbout } from './Settings/About.vue'

// NotFound
export { default as NotFound } from './NotFound.vue'
