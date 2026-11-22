import { existsSync } from 'node:fs'
import path from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { fileURLToPath } from 'node:url'

/** The tables of the Folders and Tags collections (media folders and tags), which the app no longer has. */
const RETIRED_TABLES = [
  'folders',
  'folders_rels',
  '_folders_v',
  '_folders_v_rels',
  'tags',
  'tags_rels',
  '_tags_v',
  '_tags_v_rels',
]

/**
 * Drops the tables of the removed Folders and Tags collections. Payload's database update
 * (on `pnpm dev`, and in deploy.sh) would drop them too, but stops halfway: the two tables
 * reference each other, and SQLite refuses to drop either one while foreign keys are on.
 * So this runs at the start of that update (see database.ts).
 *
 * In the same transaction it clears what pointed at the tables, as deleting the folders
 * and tags would: a photo leaves its folder, and its tag links are deleted. The photos
 * themselves are kept. The update then removes the empty columns (on media and the
 * content manager's document locks) without asking. It does nothing once both are done.
 */
export function dropRetiredTables(databaseURL: string) {
  const file = sqliteFilePath(databaseURL)
  // The database is chosen at run time; the build must not bundle the files it could be.
  if (!file || !existsSync(/*turbopackIgnore: true*/ file)) return

  const db = new DatabaseSync(file, { timeout: 10_000 })
  const isTable = db.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?")
  try {
    const existing = RETIRED_TABLES.filter((name) => isTable.get(name))
    const references = referencesTo(db, RETIRED_TABLES)
    if (!existing.length && !references.length) return

    // "3 folders and 1 tag", for the message: what staff had saved in them, if anything.
    const removed = (['folder', 'tag'] as const).flatMap((noun) => {
      const table = `${noun}s`
      if (!existing.includes(table)) return []
      const rows = Number(db.prepare(`SELECT count(*) AS n FROM "${table}"`).get()?.n ?? 0)
      return rows ? [`${rows} ${noun}${rows === 1 ? '' : 's'}`] : []
    })
    // Photos filed in a folder or tag (version history not counted).
    const filed = references
      .filter((ref) => !ref.table.startsWith('_'))
      .reduce((sum, ref) => sum + ref.count, 0)

    // Foreign keys can only be switched off outside a transaction.
    db.exec('PRAGMA foreign_keys = OFF')
    db.exec('BEGIN IMMEDIATE')
    for (const ref of references) {
      // Link rows (`*_rels`) are deleted; other rows only lose the reference.
      db.exec(
        ref.table.endsWith('_rels')
          ? `DELETE FROM "${ref.table}" WHERE "${ref.column}" IS NOT NULL`
          : `UPDATE "${ref.table}" SET "${ref.column}" = NULL WHERE "${ref.column}" IS NOT NULL`,
      )
    }
    for (const name of existing) db.exec(`DROP TABLE IF EXISTS "${name}"`)
    db.exec('COMMIT')
    const details = [
      removed.length ? `with ${removed.join(' and ')}` : '',
      filed
        ? `${filed} folder or tag assignment${filed === 1 ? '' : 's'} removed, photos kept`
        : '',
    ].filter(Boolean)
    console.info(
      `Database: removed the media folders and tags, which the app no longer uses${
        details.length ? ` (${details.join('; ')})` : ''
      }.`,
    )
  } catch (error) {
    if (db.isTransaction) db.exec('ROLLBACK')
    const reason = error instanceof Error ? error.message : String(error)
    console.warn(`Database: could not remove the media folders and tags tables: ${reason}`)
  } finally {
    db.close()
  }
}

type Reference = { table: string; column: string; count: number }

/** The columns of other tables that point at one of `tables` (by foreign key) and are set somewhere. */
function referencesTo(db: DatabaseSync, tables: string[]): Reference[] {
  const names = db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'")
    .all()
    .map((row) => String(row.name))
    .filter((name) => !tables.includes(name))
  return names.flatMap((table) =>
    db
      .prepare(`PRAGMA foreign_key_list("${table}")`)
      .all()
      .filter((key) => tables.includes(String(key.table)))
      .map((key) => {
        const column = String(key.from)
        const set = db.prepare(`SELECT count(*) AS n FROM "${table}" WHERE "${column}" IS NOT NULL`)
        return { table, column, count: Number(set.get()?.n ?? 0) }
      })
      .filter((ref) => ref.count > 0),
  )
}

/** The file in a `file:` database URL, or `null` for a database that is not a local file. */
function sqliteFilePath(url: string): string | null {
  if (url.startsWith('file://')) return fileURLToPath(url)
  if (url.startsWith('file:')) {
    return path.resolve(/*turbopackIgnore: true*/ process.cwd(), url.slice('file:'.length))
  }
  return null
}
