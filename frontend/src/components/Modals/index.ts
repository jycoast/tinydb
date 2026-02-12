import {withInstall} from "/@/utils"
import basicModal from "./BasicModal.vue"

export const BasicModal = withInstall(basicModal)
export {useModal, useModalInner} from "./useModal"
export {useModalContext} from "./useModalContext"
export {createContextMenu, destroyContextMenu} from "./createContextMenu"
export * from "./typing"
