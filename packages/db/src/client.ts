import { waddler } from "waddler/duckdb-neo"

let _sql: ReturnType<typeof waddler> | null = null

export function getClient(url: string): ReturnType<typeof waddler> {
  if (!_sql) {
    _sql = waddler({ url })
  }
  return _sql
}

export function createClient(url: string): ReturnType<typeof waddler> {
  return waddler({ url })
}
