import type { AppRouteRecordRaw } from "/@/router/types"
import { LAYOUT } from "../constant"

export const RootRoute: AppRouteRecordRaw = {
  path: "/",
  name: "Root",
  component: LAYOUT,
  meta: {
    title: "Root",
  },
}

export const basicRoutes = [RootRoute]
