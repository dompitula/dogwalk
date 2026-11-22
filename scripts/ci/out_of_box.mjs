// out_of_box: deploys the app the way a new user does, checks that it works, and removes it.
//
//   node scripts/ci/out_of_box.mjs [--allow-teardown] [--timeout-minutes N]
//
// 1. Starts `bash deploy.sh --port 3123` (Linux) or `deploy.cmd --port 3123` (Windows),
//    from this folder, with nothing installed beforehand.
// 2. Waits until the app answers over HTTP, then checks the public site, the staff pages
//    and the REST API (see CHECKS below).
// 3. Stops the app and runs `--teardown --yes`, then checks that the teardown removed
//    everything it should.
//
// CI runs it (.github/workflows/ci.yml, job out_of_box). It ends with the teardown, which
// deletes the database, uploaded photos, .env, .venv, node_modules and .next, so it refuses
// to run outside CI unless --allow-teardown is passed. Run it locally only in a throwaway
// clone: `git clone . <folder>`, then `node scripts/ci/out_of_box.mjs --allow-teardown` there.
//
// Plain Node.js with no dependencies: it runs before deploy.sh has installed anything.

import { spawn, spawnSync } from 'node:child_process'
import { appendFileSync, createWriteStream, existsSync } from 'node:fs'
import net from 'node:net'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { setTimeout as sleep } from 'node:timers/promises'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
process.chdir(root)

const PORT = 3123
const BASE = `http://127.0.0.1:${PORT}`
const LOG_FILE = path.join(root, 'out_of_box.log')
const isWindows = process.platform === 'win32'
const args = process.argv.slice(2)

// --- Options and the safety guard ----------------------------------------------------

function option(name) {
  const index = args.indexOf(name)
  return index === -1 ? undefined : args[index + 1]
}
const timeoutMinutes = Number(option('--timeout-minutes') ?? 30)
if (!Number.isFinite(timeoutMinutes) || timeoutMinutes <= 0) {
  console.error('out_of_box: --timeout-minutes needs a positive number.')
  process.exit(2)
}

if (process.env.CI !== 'true' && !args.includes('--allow-teardown')) {
  console.error(`out_of_box: refusing to run outside CI.

This script ends with "deploy.sh --teardown --yes", which deletes, in ${root}:
  the database (shelter.db), uploaded photos (media/), .env, .venv/, node_modules/ and .next/.

Run it in a throwaway clone instead:
  git clone . <folder>
  cd <folder>
  node scripts/ci/out_of_box.mjs --allow-teardown`)
  process.exit(2)
}

// --- Results -------------------------------------------------------------------------

/** @type {{ name: string; ok: boolean; details: string }[]} */
const results = []
function record(name, ok, details = '') {
  results.push({ name, ok, details })
  console.log(`\n[out_of_box] ${ok ? 'PASS' : 'FAIL'}  ${name}${details ? ` (${details})` : ''}`)
  return ok
}

const escapeCell = (text) => text.replaceAll('|', '\\|').replaceAll('\n', ' ')

function report() {
  const passed = results.length > 0 && results.every((result) => result.ok)
  const table = [
    '| Check | Result | Details |',
    '| --- | --- | --- |',
    ...results.map(
      (result) =>
        `| ${escapeCell(result.name)} | ${result.ok ? 'pass' : '**FAIL**'} | ${escapeCell(result.details)} |`,
    ),
  ].join('\n')
  const title = `### out_of_box (${process.platform}): ${passed ? 'passed' : 'FAILED'}`
  console.log(`\n${title}\n\n${table}\n`)
  if (process.env.GITHUB_STEP_SUMMARY) {
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${title}\n\n${table}\n\n`)
  }
  return passed
}

// --- Running deploy.sh ---------------------------------------------------------------

const log = createWriteStream(LOG_FILE, { flags: 'a' })

/** Starts deploy.sh (deploy.cmd on Windows) with `deployArgs`, its output to the console and the log. */
function deploy(deployArgs, { detached = false } = {}) {
  const [command, commandArgs] = isWindows
    ? // .\ because cmd.exe does not look in the current folder when
      // NoDefaultCurrentDirectoryInExePath is set.
      ['cmd.exe', ['/d', '/s', '/c', ['.\\deploy.cmd', ...deployArgs].join(' ')]]
    : ['bash', ['deploy.sh', ...deployArgs]]
  log.write(`\n$ ${command} ${commandArgs.join(' ')}\n`)
  // stdin is closed: a question nobody can answer fails the run instead of hanging it.
  const child = spawn(command, commandArgs, {
    cwd: root,
    stdio: ['ignore', 'pipe', 'pipe'],
    detached,
  })
  let output = ''
  for (const stream of [child.stdout, child.stderr]) {
    stream.on('data', (chunk) => {
      process.stdout.write(chunk)
      log.write(chunk)
      output += chunk
    })
  }
  const exited = new Promise((resolve) => {
    child.on('exit', (code, signal) => resolve({ code, signal }))
    child.on('error', (error) => resolve({ code: null, signal: null, error }))
  })
  return { child, exited, output: () => output }
}

/** Runs deploy.sh to the end and returns its exit code and output. */
async function deployToEnd(deployArgs) {
  const run = deploy(deployArgs)
  const { code } = await run.exited
  return { code, output: run.output() }
}

const lastLines = (text, count) => text.split(/\r?\n/).slice(-count).join('\n')

// --- HTTP ----------------------------------------------------------------------------

async function get(pathname, init = {}) {
  return fetch(BASE + pathname, { signal: AbortSignal.timeout(30_000), ...init })
}

/** Polls GET / until it answers 200, the deploy exits, or the deadline passes. */
async function waitForApp(deployRun) {
  const started = Date.now()
  const deadline = started + timeoutMinutes * 60_000
  let exit = null
  void deployRun.exited.then((result) => {
    exit = result
  })
  let lastProblem = ''
  while (Date.now() < deadline) {
    let problem = ''
    if (exit) {
      const how = exit.error ? exit.error.message : `exit code ${exit.code ?? exit.signal}`
      console.error(`\ndeploy exited before the app answered (${how}). Last 50 lines:\n`)
      console.error(lastLines(deployRun.output(), 50))
      return record('Deploy starts the app', false, `deploy exited first: ${how}`)
    }
    try {
      const response = await get('/', { signal: AbortSignal.timeout(10_000) })
      if (response.status === 200) {
        const seconds = Math.round((Date.now() - started) / 1000)
        return record('Deploy starts the app', true, `GET / answered 200 after ${seconds} s`)
      }
      problem = `GET / answered ${response.status}`
    } catch (error) {
      problem = error instanceof Error ? error.message : String(error)
    }
    // Only when it changes, so the deploy output stays readable.
    if (problem !== lastProblem) console.log(`\n[out_of_box] waiting for the app: ${problem}`)
    lastProblem = problem
    await sleep(5_000)
  }
  return record(
    'Deploy starts the app',
    false,
    `no 200 from GET / within ${timeoutMinutes} min (${lastProblem})`,
  )
}

// --- The checks ----------------------------------------------------------------------

const isRedirect = (response, ...targets) =>
  [303, 307, 308].includes(response.status) &&
  targets.some(
    (target) => new URL(response.headers.get('location') ?? '', BASE).pathname === target,
  )

const CHECKS = [
  {
    name: 'GET / lists the sample walks',
    async run() {
      const response = await get('/')
      const html = await response.text()
      const dogs = ['Milo', 'Luna', 'Cooper'].filter((name) => html.includes(name))
      const ok = response.status === 200 && html.includes('The Good Walk') && dogs.length > 0
      return [
        ok,
        `${response.status}, brand ${html.includes('The Good Walk') ? 'shown' : 'missing'}, dogs: ${dogs.join(', ') || 'none'}`,
      ]
    },
  },
  {
    name: 'GET /dashboard redirects to the sign-in page',
    async run() {
      const response = await get('/dashboard', { redirect: 'manual' })
      return [
        isRedirect(response, '/dashboard/login'),
        `${response.status} -> ${response.headers.get('location')}`,
      ]
    },
  },
  {
    name: 'GET /dashboard/login',
    async run() {
      const response = await get('/dashboard/login')
      return [response.status === 200, String(response.status)]
    },
  },
  {
    name: 'GET /admin (content manager)',
    async run() {
      const response = await get('/admin', { redirect: 'manual' })
      const ok =
        response.status === 200 || isRedirect(response, '/admin/create-first-user', '/admin/login')
      return [
        ok,
        `${response.status}${response.headers.get('location') ? ` -> ${response.headers.get('location')}` : ''}`,
      ]
    },
  },
  {
    name: 'GET /api/walk-slots has the 10 sample walks, without staff-only fields',
    async run() {
      const response = await get('/api/walk-slots?limit=100&depth=0')
      const body = await response.json().catch(() => null)
      const docs = Array.isArray(body?.docs) ? body.docs : []
      const leaked = docs.filter((doc) => 'route' in doc || 'handlingNotes' in doc).length
      const ok = response.status === 200 && body?.totalDocs === 10 && leaked === 0
      return [
        ok,
        `${response.status}, totalDocs ${body?.totalDocs}, ${leaked} with staff-only fields`,
      ]
    },
  },
  {
    name: 'GET /api/bookings is refused to visitors',
    async run() {
      const response = await get('/api/bookings')
      return [response.status === 403, `${response.status} (expected 403)`]
    },
  },
]

async function runChecks() {
  for (const check of CHECKS) {
    try {
      const [ok, details] = await check.run()
      record(check.name, ok, details)
    } catch (error) {
      record(check.name, false, error instanceof Error ? error.message : String(error))
    }
  }
}

// --- Stopping the app ----------------------------------------------------------------

function portIsFree() {
  return new Promise((resolve) => {
    const server = net.createServer()
    server.once('error', () => resolve(false))
    server.listen(PORT, () => server.close(() => resolve(true)))
  })
}

/** Stops whatever still listens on the port (the Node server can outlive its parents). */
function killListeners() {
  if (isWindows) {
    spawnSync(
      'powershell.exe',
      [
        '-NoProfile',
        '-NonInteractive',
        '-Command',
        `Get-NetTCPConnection -LocalPort ${PORT} -State Listen -ErrorAction SilentlyContinue | ` +
          'ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }',
      ],
      { stdio: 'inherit' },
    )
  } else {
    const result = spawnSync('fuser', ['-k', `${PORT}/tcp`], { stdio: 'inherit' })
    if (result.error) console.log(`fuser is not available (${result.error.message}).`)
  }
}

async function stopApp(deployRun) {
  const { child } = deployRun
  const running = () => child.exitCode === null && child.signalCode === null
  if (running()) {
    if (isWindows) {
      // /T also stops the process tree; MSYS `exec` can break the tree, hence killListeners.
      spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'inherit' })
    } else {
      try {
        process.kill(-child.pid, 'SIGTERM') // the whole process group (detached: true)
      } catch {}
      const stopped = await Promise.race([
        deployRun.exited.then(() => true),
        sleep(10_000).then(() => false),
      ])
      if (!stopped) {
        try {
          process.kill(-child.pid, 'SIGKILL')
        } catch {}
      }
    }
  }
  killListeners()

  // On Windows a running app keeps shelter.db locked, and the teardown would fail.
  const deadline = Date.now() + 30_000
  while (Date.now() < deadline) {
    if (await portIsFree()) return record('Stop the app', true, `port ${PORT} is free`)
    killListeners()
    await sleep(1_000)
  }
  return record('Stop the app', false, `port ${PORT} is still in use after 30 s`)
}

// --- Teardown ------------------------------------------------------------------------

const REMOVED = ['shelter.db', 'media', '.env', '.venv', 'node_modules', '.next', 'next-env.d.ts']

async function teardown() {
  let result = await deployToEnd(['--teardown', '--yes'])
  if (result.code !== 0 && isWindows && /could not delete/i.test(result.output)) {
    console.log('\nA file was still locked. Trying the teardown again in 5 seconds.')
    await sleep(5_000)
    result = await deployToEnd(['--teardown', '--yes'])
  }
  record('Teardown (--teardown --yes)', result.code === 0, `exit code ${result.code}`)

  const left = REMOVED.filter((name) => existsSync(path.join(root, name)))
  record(
    'Teardown removed everything',
    left.length === 0,
    left.length ? `still there: ${left.join(', ')}` : REMOVED.join(', '),
  )
}

// --- Main ----------------------------------------------------------------------------

console.log(`out_of_box: deploying from ${root} (log: ${LOG_FILE})`)
const deployRun = deploy(['--port', String(PORT)], { detached: !isWindows })
try {
  if (await waitForApp(deployRun)) await runChecks()
} finally {
  await stopApp(deployRun)
  await teardown()
}
log.end()
process.exit(report() ? 0 : 1)
