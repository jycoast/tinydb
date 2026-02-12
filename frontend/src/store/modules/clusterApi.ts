import { defineStore } from "pinia"

interface ClusterApiStore {
  connectionList: Nullable<any>
  connection: Nullable<any>
  [key: string]: Nullable<any>
}

export const useClusterApiStore = defineStore({
  id: "app-reuse",
  state: (): ClusterApiStore => ({
    connectionList: null,
    connection: null,
  }),
  actions: {
    setConnectionList(value) {
      this.connectionList = value
    },
    setConnection(value) {
      this.connection = value
    },
  },
})
