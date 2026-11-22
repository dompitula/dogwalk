import { rmSync } from 'node:fs'
import path from 'node:path'

/**
 * Runs once per `vitest run`, before any integration test file: deletes the databases and
 * media folders of earlier runs. Cleanup never fails a run: on Windows, a process from an
 * earlier run may still hold a lock on one of the files.
 */
export default function setup() {
  const folder = path.resolve(process.cwd(), '.tmp-tests')
  try {
    rmSync(folder, { recursive: true, force: true })
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error)
    console.warn(`Could not delete ${folder} from an earlier run (${reason}). Continuing.`)
  }
}
