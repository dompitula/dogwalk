import configPromise from '@payload-config'
import { type Payload, getPayload } from 'payload'

let ready: Promise<Payload> | undefined

/**
 * The app's Payload instance, on this test file's database (see setup.ts). The first call
 * starts Payload and creates the tables; Payload caches the instance for the process, so
 * the server actions under test get the same one.
 */
export function getTestPayload(): Promise<Payload> {
  ready ??= (async () => {
    const config = await configPromise
    // For tests only: no background `payload generate:types` run, which would rewrite
    // src/payload-types.ts from every test process, and no telemetry request.
    config.typescript.autoGenerate = false
    config.telemetry = false
    return getPayload({ config })
  })()
  return ready
}
