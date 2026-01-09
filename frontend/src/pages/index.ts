/**
 * Pages 统一导出
 * 统一导出所有页面和布局组件，方便引用
 */

// 布局组件
export { default as DefaultLayout } from './layout/DefaultLayout.vue'
export { default as TitleBar } from './layout/TitleBar.vue'
export { default as ToolBar } from './layout/ToolBar.vue'
export { default as MenuBar } from './layout/MenuBar.vue'
export { default as TabRegister } from './layout/TabRegister.vue'
export { default as TabContent } from './layout/TabContent.vue'

// 查询相关页面
export { default as QueryHistoryPage } from './query/QueryHistoryPage.vue'

// 数据库相关页面
export { default as DatabaseTreePage } from './database/DatabaseTreePage.vue'