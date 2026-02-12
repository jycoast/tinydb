import type {ComputedRef} from "vue"

// ==================== Modal 类型 ====================

export interface ModalMethods {
  setModalProps: (props: Partial<ModalProps>) => void
  emitVisible?: (visible: boolean, uid: number) => void
  redoModalHeight?: () => void
}

export type RegisterFn = (modalMethods: ModalMethods, uuid?: string) => void

export interface ReturnMethods extends ModalMethods {
  openModal: <T = any>(visible?: boolean, data?: T, openOnSet?: boolean) => void
  closeModal: () => void
  getVisible?: ComputedRef<boolean>
}

export type UseModalReturnType = [RegisterFn, ReturnMethods]

export interface ReturnInnerMethods extends ModalMethods {
  closeModal: () => void
  changeLoading: (loading: boolean) => void
  changeOkLoading: (loading: boolean) => void
  getVisible?: ComputedRef<boolean>
  redoModalHeight: () => void
}

export type UseModalInnerReturnType = [RegisterFn, ReturnInnerMethods]

export interface ModalProps {
  visible?: boolean
  title?: string
  width?: string | number
  loading?: boolean
  loadingTip?: string
  confirmLoading?: boolean
  showOkBtn?: boolean
  showCancelBtn?: boolean
  destroyOnClose?: boolean
  maskClosable?: boolean
  okText?: string
  cancelText?: string
  footer?: any
  closeFunc?: () => Promise<boolean>
  okButtonProps?: Record<string, any>
  cancelButtonProps?: Record<string, any>
}

// ==================== ContextMenu 类型 ====================

export interface ContextMenuItem {
  divider?: boolean
  text?: string
  label: string
  keyText?: string
  onClick?: Fn
  submenu?: ContextMenuItem[]
}

export interface CreateContextOptions {
  event: MouseEvent
  icon?: string
  styles?: any
  items?: ContextMenuItem[] | Fn
}

export interface ContextMenuProps {
  event?: MouseEvent
  styles?: any
  items: ContextMenuItem[] | Fn
  left?: number
  top?: number
  targetElement?: string | string[]
}

export interface ItemContentProps {
  showIcon: boolean | undefined
  item: ContextMenuItem
  onClick: Fn
}
