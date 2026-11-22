import { sqliteAdapter } from '@payloadcms/db-sqlite'
import { dropRetiredTables } from './upgrade-data'

/** What the fix uses of drizzle-kit, as Payload loads it (`statementsToExecute` is not in Payload's types). */
type DrizzleKit = {
  pushSchema: (...args: unknown[]) => Promise<{ statementsToExecute?: string[] }>
}
type WithDrizzleKit = { requireDrizzleKit?: () => Promise<DrizzleKit> }

/**
 * The SQLite database adapter, with two additions to Payload's schema push: the step that
 * updates the tables to the collections on `pnpm dev` and in deploy.sh (never in production).
 *
 * - Before the push works out its changes, the tables of removed collections are dropped
 *   (see `dropRetiredTables`), which the push cannot do itself. Running it here, and only
 *   here, means the database is never left between the two steps.
 * - SQLite cannot drop a column in place when it is a relationship, so when such a field
 *   is removed, drizzle-kit (which runs the push) rebuilds the table. drizzle-kit 0.31 then
 *   lists each of the table's indexes twice; the second CREATE INDEX fails ("index already
 *   exists") and the push stops halfway. The repeated statements are removed before they
 *   run. This is no longer needed once Payload ships a drizzle-kit without the bug.
 */
export function sqliteDatabase(url: string): ReturnType<typeof sqliteAdapter> {
  const result = sqliteAdapter({ client: { url } })
  return {
    ...result,
    init: (args) => {
      const adapter = result.init(args)
      const withKit = adapter as unknown as WithDrizzleKit
      const loadDrizzleKit = withKit.requireDrizzleKit
      if (typeof loadDrizzleKit !== 'function') return adapter

      withKit.requireDrizzleKit = async () => {
        const kit = await loadDrizzleKit()
        return {
          ...kit,
          pushSchema: async (...pushArgs: unknown[]) => {
            dropRetiredTables(url)
            const plan = await kit.pushSchema(...pushArgs)
            if (plan.statementsToExecute) removeRepeatedIndexes(plan.statementsToExecute)
            return plan
          },
        }
      }
      return adapter
    },
  }
}

/**
 * Removes, in place, each CREATE INDEX that repeats one created since the last DROP (the
 * push runs this same array). An index is only created again after its table or the index
 * itself was dropped, so a repeat without a DROP in between would fail.
 */
export function removeRepeatedIndexes(statements: string[]) {
  const created = new Set<string>()
  let kept = 0
  for (const statement of statements) {
    const text = statement.trim()
    if (/^DROP\s/i.test(text)) created.clear()
    if (/^CREATE\s+(UNIQUE\s+)?INDEX\s/i.test(text)) {
      if (created.has(text)) continue
      created.add(text)
    }
    statements[kept++] = statement
  }
  statements.length = kept
}
