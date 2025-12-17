declare module 'sql-formatter' {
  export function format(sql: string, cfg?: any): string
  const _default: { format: typeof format }
  export default _default
}


