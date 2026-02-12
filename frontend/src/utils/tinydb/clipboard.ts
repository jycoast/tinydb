import { get, pick } from "lodash-es"
import { stringifyCellValue } from "/@/lib/tinydb-tools"
import yaml from "js-yaml"

export function copyTextToClipboard(text) {
  const oldFocus = document.activeElement

  const textArea = document.createElement("textarea")
  textArea.style.position = "fixed"
  textArea.style.top = "0"
  textArea.style.left = "0"
  textArea.style.width = "2em"
  textArea.style.height = "2em"
  textArea.style.padding = "0"
  textArea.style.border = "none"
  textArea.style.outline = "none"
  textArea.style.boxShadow = "none"
  textArea.style.background = "transparent"
  textArea.value = text

  document.body.appendChild(textArea)
  textArea.select()

  try {
    document.execCommand("copy")
  } catch (err) {
    console.log("Failed copy to clipboard: " + err)
  }

  document.body.removeChild(textArea)

  if (oldFocus) {
    // @ts-ignore
    oldFocus.focus()
  }
}

export function extractRowCopiedValue(row, col) {
  let value = row[col]
  if (value === undefined) value = get(row, col)
  return stringifyCellValue(value)
}

const clipboardTextFormatter = (delimiter, headers) => (columns, rows) => {
  const lines: any[] = []
  if (headers) lines.push(columns.join(delimiter))
  lines.push(
    ...rows.map(row => {
      if (!row) return ""
      return columns.map(col => extractRowCopiedValue(row, col)).join(delimiter)
    })
  )
  return lines.join("\r\n")
}

const clipboardJsonFormatter = () => (columns, rows) => {
  return JSON.stringify(rows.map(row => pick(row, columns)), undefined, 2)
}

const clipboardYamlFormatter = () => (columns, rows) => {
  return yaml.dump(rows.map(row => pick(row, columns)))
}

const clipboardJsonLinesFormatter = () => (columns, rows) => {
  return rows.map(row => JSON.stringify(pick(row, columns))).join("\r\n")
}

const clipboardInsertsFormatter = () => (columns, rows, options) => {
  const { schemaName, pureName, driver } = options
  const dmp = driver.createDumper()
  for (const row of rows) {
    dmp.putCmd(
      "^insert ^into %f (%,i) ^values (%,v)",
      { schemaName, pureName },
      columns,
      columns.map(col => row[col])
    )
  }
  return dmp.s
}

const clipboardUpdatesFormatter = () => (columns, rows, options) => {
  const { schemaName, pureName, driver, keyColumns } = options
  const dmp = driver.createDumper()
  for (const row of rows) {
    dmp.put("^update %f ^set ", { schemaName, pureName })
    dmp.putCollection(", ", columns, col => dmp.put("%i=%v", col, row[col]))
    dmp.put(" ^where ")
    dmp.putCollection(" ^and ", keyColumns, col => dmp.put("%i=%v", col, row[col]))
    dmp.endCommand()
  }
  return dmp.s
}

const clipboardMongoInsertFormatter = () => (columns, rows, options) => {
  const { pureName } = options
  return rows
    .map(row => `db.${pureName}.insert(${JSON.stringify(pick(row, columns), undefined, 2)});`)
    .join("\n")
}

export function formatClipboardRows(format, columns, rows, options) {
  if (format in copyRowsFormatDefs) {
    return copyRowsFormatDefs[format].formatter(columns, rows, options)
  }
  return ""
}

export function copyRowsToClipboard(format, columns, rows, options) {
  const formatted = formatClipboardRows(format, columns, rows, options)
  copyTextToClipboard(formatted)
}

export const copyRowsFormatDefs = {
  textWithHeaders: {
    label: "Copy with headers",
    name: "With headers",
    formatter: clipboardTextFormatter("\t", true),
  },
  textWithoutHeaders: {
    label: "Copy without headers",
    name: "Without headers",
    formatter: clipboardTextFormatter("\t", false),
  },
  csv: {
    label: "Copy as CSV",
    name: "CSV",
    formatter: clipboardTextFormatter(",", true),
  },
  json: {
    label: "Copy as JSON",
    name: "JSON",
    formatter: clipboardJsonFormatter(),
  },
  jsonLines: {
    label: "Copy as JSON lines/NDJSON",
    name: "JSON lines/NDJSON",
    formatter: clipboardJsonLinesFormatter(),
  },
  yaml: {
    label: "Copy as YAML",
    name: "YAML",
    formatter: clipboardYamlFormatter(),
  },
  inserts: {
    label: "Copy as SQL INSERTs",
    name: "SQL INSERTs",
    formatter: clipboardInsertsFormatter(),
  },
  updates: {
    label: "Copy as SQL UPDATEs",
    name: "SQL UPDATEs",
    formatter: clipboardUpdatesFormatter(),
  },
  mongoInsert: {
    label: "Copy as Mongo INSERTs",
    name: "Mongo INSERTs",
    formatter: clipboardMongoInsertFormatter(),
  },
}
