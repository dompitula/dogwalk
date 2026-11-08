// Creates `.env` from `.env.example` with a freshly generated PAYLOAD_SECRET.
// Usage: pnpm run create-env   (safe to run again: an existing .env is never overwritten)
import { randomBytes } from 'node:crypto'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const envPath = path.join(root, '.env')
const examplePath = path.join(root, '.env.example')

if (existsSync(envPath)) {
  console.log('.env already exists, leaving it unchanged.')
  process.exit(0)
}

const secret = randomBytes(32).toString('hex')
const contents = readFileSync(examplePath, 'utf8').replace(
  /^PAYLOAD_SECRET=.*$/m,
  `PAYLOAD_SECRET=${secret}`,
)

if (!contents.includes(`PAYLOAD_SECRET=${secret}`)) {
  console.error('Could not find a PAYLOAD_SECRET= line in .env.example.')
  process.exit(1)
}

writeFileSync(envPath, contents)
console.log('Created .env with a new PAYLOAD_SECRET.')
