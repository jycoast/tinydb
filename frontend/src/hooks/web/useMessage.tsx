import { ElMessage, ElMessageBox, ElNotification } from "element-plus"
import type { NotificationOptions } from "element-plus"
import { isString } from "/@/utils/is"

export interface NotifyApi {
  info(config: NotificationOptions): void
  success(config: NotificationOptions): void
  error(config: NotificationOptions): void
  warn(config: NotificationOptions): void
  warning(config: NotificationOptions): void
  open(args: NotificationOptions): void
  close(key: string): void
}

export interface ModalOptionsPartial {
  content: string | (() => any)
  title?: string
  okText?: string
  cancelText?: string
}

function renderContent(content: string | (() => any)) {
  if (isString(content)) {
    return content
  }
  return typeof content === "function" ? content() : content
}

function createConfirm(options: ModalOptionsPartial & { iconType?: string }) {
  const { content, title, okText, cancelText } = options
  return ElMessageBox.confirm(renderContent(content), title || "提示", {
    confirmButtonText: okText || "确定",
    cancelButtonText: cancelText || "取消",
    type: "warning",
  })
}

function createSuccessModal(options: ModalOptionsPartial) {
  return ElMessageBox.alert(renderContent(options.content), options.title || "成功", {
    type: "success",
    confirmButtonText: options.okText || "确定",
  })
}

function createErrorModal(options: ModalOptionsPartial) {
  return ElMessageBox.alert(renderContent(options.content), options.title || "错误", {
    type: "error",
    confirmButtonText: options.okText || "确定",
  })
}

function createInfoModal(options: ModalOptionsPartial) {
  return ElMessageBox.alert(renderContent(options.content), options.title || "信息", {
    type: "info",
    confirmButtonText: options.okText || "确定",
  })
}

function createWarningModal(options: ModalOptionsPartial) {
  return ElMessageBox.alert(renderContent(options.content), options.title || "警告", {
    type: "warning",
    confirmButtonText: options.okText || "确定",
  })
}

function toElNotificationOpt(opt: any, type?: string) {
  const { message: msg, description, duration, ...rest } = opt
  return {
    ...rest,
    title: msg,
    message: description || msg,
    duration: duration ?? 3000,
    type,
  }
}

const notificationAdapter: NotifyApi = {
  info: (opt) => ElNotification(toElNotificationOpt(opt, "info")),
  success: (opt) => ElNotification(toElNotificationOpt(opt, "success")),
  error: (opt) => ElNotification(toElNotificationOpt(opt, "error")),
  warn: (opt) => ElNotification(toElNotificationOpt(opt, "warning")),
  warning: (opt) => ElNotification(toElNotificationOpt(opt, "warning")),
  open: (opt) => ElNotification(toElNotificationOpt(opt)),
  close: () => {},
}

export function useMessage() {
  return {
    createMessage: ElMessage,
    notification: notificationAdapter,
    createConfirm,
    createSuccessModal,
    createErrorModal,
    createInfoModal,
    createWarningModal,
  }
}
