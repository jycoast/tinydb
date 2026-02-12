import type { Ref } from "vue"

export interface IPinnedDatabasesItem {
  extInfo?: string | Ref<string> | undefined
  connection: {
    engine: string
    password: string
    server: string
    sshKeyfile: string
    sshMode: string
    sshPort: string
    user: string
    _id: string
    singleDatabase?: string
  }
  name: string
  objectTypeField?: string
  title: string
}
