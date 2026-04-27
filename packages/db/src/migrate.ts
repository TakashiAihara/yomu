import { readdir, readFile } from "node:fs/promises"
import { join } from "node:path"
import { createClient } from "./client.js"

const MIGRATIONS_DIR = new URL("../migrations", import.meta.url).pathname

export async function migrate(url: string): Promise<void> {
  const sql = createClient(url)

  await sql`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version    TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `

  const applied = new Set(
    (await sql<{ version: string }>`SELECT version FROM schema_migrations`).map(
      (r) => r.version,
    ),
  )

  const files = (await readdir(MIGRATIONS_DIR))
    .filter((f) => f.endsWith(".sql"))
    .sort()

  for (const file of files) {
    const version = file.replace(".sql", "")
    if (applied.has(version)) continue

    const sqls = await readFile(join(MIGRATIONS_DIR, file), "utf-8")
    for (const statement of sqls.split(";").map((s) => s.trim()).filter(Boolean)) {
      await sql.raw(statement)
    }

    await sql`INSERT INTO schema_migrations (version) VALUES (${version})`
    console.log(`applied: ${file}`)
  }
}

if (import.meta.main) {
  const url = process.env.DATABASE_URL ?? "yomu.db"
  await migrate(url)
}
