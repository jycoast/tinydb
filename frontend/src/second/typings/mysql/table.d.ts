type TableName = { name: string }

export interface TablesNameSort extends TableName {
  sortOrder?: string
}

interface PureName {
  pureName: string
  tableRowCount: string
  modifyDate: Date.string
}

type Column = Record<>
