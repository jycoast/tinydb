type ConnectionStatus = "pending" | "ok" | "error"

interface IConnection {
  server: string
  engine: string
  sshModeL: string
  user: string
  password: string
  _id: string
}

export interface IConnectionStatus {
  name: ConnectionStatus
  message: string
}

export interface IActiveConnection extends IConnection, IConnectionStatus {}
