import type { RouteRecordRaw } from "vue-router"
import type { App } from "vue"
import { createRouter, createWebHashHistory } from "vue-router"
import { basicRoutes } from "./routes"

// Wails 内嵌资源环境下使用 Hash 路由，避免 History 模式导致白屏
export const router = createRouter({
  history: createWebHashHistory(import.meta.env.VITE_PUBLIC_PATH),
  routes: basicRoutes as unknown as RouteRecordRaw[],
  strict: true,
  scrollBehavior: () => ({ left: 0, top: 0 }),
})

export function setupRouter(app: App<Element>) {
  app.use(router)
}
