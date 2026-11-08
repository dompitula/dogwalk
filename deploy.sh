#!/usr/bin/env bash
#
# deploy.sh: build ShelterWalk and start it in production mode.
#
# Everything the app needs is installed into .venv/ in this folder: Node.js
# (the version pinned in .mise.toml), pnpm (the version pinned in package.json)
# and pnpm's package store. The Node.js, npm, pnpm or Corepack installed on
# this computer are not used or changed. Delete .venv/ to remove all of it.
#
# Runs on Linux, and on Windows in Git Bash. In PowerShell or Command Prompt
# use deploy.cmd, which starts this script with Git Bash.
#
# Usage: bash deploy.sh [--port PORT] [--clean]
#        bash deploy.sh --teardown [--yes]

set -euo pipefail

usage() {
  cat <<'EOF'
Usage: bash deploy.sh [--port PORT] [--clean]
       bash deploy.sh --teardown [--yes]
       .\deploy.cmd ...   (Windows: PowerShell or Command Prompt, same options)

Installs Node.js and pnpm into .venv/, installs the app's dependencies,
creates .env if it does not exist yet, builds the app and starts it in
production mode. Stop the app with Ctrl+C.

Options:
  --port PORT   Port to serve the app on (default: $PORT, or 3000)
  --clean       Start without sample data: an empty database stays empty.
                A database that already has data is kept as it is.
  --teardown    Delete the app's data (database, uploaded photos, .env) and
                everything deploy.sh installed or built, after asking. The app
                is not started. Stop the app before running it.
  --yes         With --teardown: do not ask first
  -h, --help    Show this help and exit
EOF
}

die() { printf '\ndeploy.sh: %s\n' "$*" >&2; exit 1; }
step() { printf '\n==> %s\n' "$*"; }

port="${PORT:-3000}" port_given=0 clean=0 teardown=0 assume_yes=0
while [ $# -gt 0 ]; do
  case "$1" in
    --port) [ $# -ge 2 ] || die "--port needs a value, for example --port 8080"; port="$2" port_given=1; shift 2 ;;
    --port=*) port="${1#--port=}" port_given=1; shift ;;
    --clean) clean=1; shift ;;
    --teardown) teardown=1; shift ;;
    --yes | -y) assume_yes=1; shift ;;
    -h | --help) usage; exit 0 ;;
    *) usage >&2; die "unknown option: $1" ;;
  esac
done
if [ "$teardown" = 1 ]; then
  [ "$port_given" = 0 ] && [ "$clean" = 0 ] ||
    die "--teardown only deletes; it cannot be combined with --port or --clean. Run the deploy command again afterwards."
else
  [ "$assume_yes" = 0 ] || die "--yes only applies to --teardown."
  case "$port" in '' | *[!0-9]*) die "the port must be a number, got '$port'" ;; esac
fi

root="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$root"
[ -f package.json ] || die "no package.json in $root. deploy.sh must sit in the app folder, next to package.json."

# --- Platform -----------------------------------------------------------------

case "$(uname -s)" in
  Linux*) os=linux archive=tar.gz ;;
  MINGW* | MSYS*) os=win archive=zip ;; # Git Bash on Windows
  *) die "unsupported system: $(uname -s). deploy.sh runs on Linux, or on Windows in Git Bash." ;;
esac
case "$(uname -m)" in
  x86_64 | amd64) arch=x64 ;;
  aarch64 | arm64) arch=arm64 ;;
  *) die "unsupported processor: $(uname -m)" ;;
esac

# WSL reports Linux, but on a Windows folder (/mnt/c/...) it would put Linux
# builds into the Windows project. This usually means "bash deploy.sh" was typed
# in PowerShell or Command Prompt, where bash starts WSL instead of Git Bash.
if [ "$os" = linux ] && grep -qi microsoft /proc/version 2>/dev/null; then
  case "$root" in
    /mnt/*) die "this Windows folder was opened through WSL. On Windows, run .\\deploy.cmd in PowerShell or Command Prompt, or bash deploy.sh in Git Bash." ;;
  esac
fi

# Paths handed to Node-based tools must be native Windows paths under Git Bash.
native_path() { if [ "$os" = win ]; then cygpath -w "$1"; else printf '%s\n' "$1"; fi; }

sha256_of() { sha256sum "$1" | awk '{ print $1 }'; }

# --- Teardown -----------------------------------------------------------------

# The SQLite file the app uses: DATABASE_URL from the environment, else from .env
# (the app reads it the same way), else the default. Prints nothing when the
# database is not a local file.
database_file() {
  local url="${DATABASE_URL:-}"
  if [ -z "$url" ] && [ -f .env ]; then
    url="$(sed -n 's/^[[:space:]]*DATABASE_URL[[:space:]]*=[[:space:]]*//p' .env | tail -n 1 | tr -d '\r')"
    url="${url#[\"\']}" url="${url%[\"\']}"
  fi
  url="${url:-file:./shelter.db}"
  case "$url" in file:*) url="${url#file:}" && printf '%s\n' "${url#./}" ;; esac
}

run_teardown() {
  local db paths=() labels=() i answer
  db="$(database_file)"
  add() { if [ -e "$1" ]; then paths+=("$1") labels+=("$2"); fi; }

  # The data first: on Windows a running app keeps the database locked, so the
  # teardown stops there, before anything else is deleted.
  if [ -n "$db" ]; then
    add "$db" "database: dogs, walks, bookings, staff accounts"
    for i in -journal -wal -shm; do add "$db$i" "database (temporary file)"; done
  fi
  add media "uploaded photos"
  add .env "settings, including PAYLOAD_SECRET"
  add .venv "Node.js, pnpm and the package store installed by deploy.sh"
  add node_modules "dependencies"
  add .next "the build"
  add next-env.d.ts "generated by the build"
  add tsconfig.tsbuildinfo "TypeScript cache"

  step "Teardown"
  if [ "${#paths[@]}" = 0 ]; then
    echo "Nothing to delete: there is no data and nothing installed."
    return
  fi
  [ -n "$db" ] || echo "DATABASE_URL in .env is not a local file. Delete that database's data yourself."

  # On Linux a running app can lose its database without noticing, so look for it.
  if [ "$os" = linux ] && [ -n "$db" ] && [ -f "$db" ]; then
    local abs pid
    abs="$(cd "$(dirname "$db")" && pwd -P)/$(basename "$db")"
    pid="$(find /proc/[0-9]*/fd -lname "$abs" 2>/dev/null | head -n 1 | cut -d/ -f3 || true)"
    [ -z "$pid" ] || die "ShelterWalk is still running (process $pid has $db open). Stop it with Ctrl+C in its terminal, then run the teardown again."
  fi

  echo "This deletes, in $(native_path "$root"):"
  for i in "${!paths[@]}"; do printf '  %-22s %s\n' "${paths[$i]}" "${labels[$i]}"; done
  echo "It cannot be undone. Back up the database, media and .env first if you may need them."
  echo "The code is not touched."

  if [ "$assume_yes" = 0 ]; then
    printf '\nStop the app first. Type yes to delete: '
    read -r answer || answer=""
    # Compare the letters only: Windows consoles and pipes may add a CR, and
    # PowerShell pipes start with a byte order mark.
    answer="$(printf '%s' "$answer" | LC_ALL=C tr -cd '[:alpha:]' | LC_ALL=C tr '[:upper:]' '[:lower:]')"
    [ "$answer" = yes ] || die "nothing was deleted. Type yes to confirm, or add --yes."
  fi

  for i in "${paths[@]}"; do
    rm -rf -- "$i" 2>/dev/null || [ ! -e "$i" ] ||
      die "could not delete $i. If the app is still running, stop it with Ctrl+C in its terminal, then run the teardown again."
    echo "Deleted $i"
  done
  echo
  echo "Done. To deploy again, run the deploy command (add --clean to start without sample data)."
}

if [ "$teardown" = 1 ]; then
  run_teardown
  exit 0
fi

need() { command -v "$1" >/dev/null 2>&1 || die "'$1' is required but was not found."; }
need curl
need sha256sum
if [ "$os" = win ]; then need unzip; need cygpath; else need tar; fi

# --- .venv --------------------------------------------------------------------

venv="$root/.venv"
node_dir="$venv/node"
if [ "$os" = win ]; then node_bin="$node_dir"; else node_bin="$node_dir/bin"; fi

mkdir -p "$venv"
# Keep .venv/ out of git without having to edit .gitignore.
[ -f "$venv/.gitignore" ] || printf '# Created by deploy.sh\n*\n' >"$venv/.gitignore"

# --- Node.js ------------------------------------------------------------------

node_version="$(sed -n 's/^node *= *"\([0-9.]*\)".*/\1/p' .mise.toml 2>/dev/null | head -n 1)"
node_version="${node_version:-24.22.1}"

step "Node.js $node_version"
if [ "$("$node_bin/node" --version 2>/dev/null || true)" = "v$node_version" ]; then
  echo "Already installed in .venv/node"
else
  dist="node-v$node_version-$os-$arch"
  base_url="https://nodejs.org/dist/v$node_version"
  tmp="$venv/download"
  rm -rf "$tmp" "$node_dir"
  mkdir -p "$tmp"

  echo "Downloading $base_url/$dist.$archive"
  curl -fsSL --retry 3 -o "$tmp/$dist.$archive" "$base_url/$dist.$archive" ||
    die "could not download Node.js. Check the internet connection and run deploy.sh again."
  curl -fsSL --retry 3 -o "$tmp/SHASUMS256.txt" "$base_url/SHASUMS256.txt" ||
    die "could not download the Node.js checksums. Check the internet connection and run deploy.sh again."

  expected="$(awk -v file="$dist.$archive" '$2 == file { print $1 }' "$tmp/SHASUMS256.txt")"
  [ -n "$expected" ] || die "$dist.$archive is not listed in SHASUMS256.txt."
  [ "$(sha256_of "$tmp/$dist.$archive")" = "$expected" ] ||
    die "checksum mismatch for $dist.$archive. The download is damaged; run deploy.sh again."
  echo "Checksum OK"

  if [ "$archive" = zip ]; then unzip -q "$tmp/$dist.$archive" -d "$tmp"; else tar -xzf "$tmp/$dist.$archive" -C "$tmp"; fi
  mv "$tmp/$dist" "$node_dir"
  rm -rf "$tmp"
  echo "Installed in .venv/node"
fi

# From here on, node, npm and pnpm all come from .venv.
export PATH="$node_bin:$PATH"
hash -r

# --- pnpm ---------------------------------------------------------------------

pnpm_version="$(node -p "((require('./package.json').packageManager || '').match(/^pnpm@([^+]+)/) || [])[1] || ''")"
[ -n "$pnpm_version" ] || die "package.json has no \"packageManager\": \"pnpm@<version>\" entry."

step "pnpm $pnpm_version"
if [ -x "$node_bin/pnpm" ] && [ "$("$node_bin/pnpm" --version 2>/dev/null || true)" = "$pnpm_version" ]; then
  echo "Already installed in .venv/node"
else
  # Installed with npm (not Corepack) into .venv/node, so nothing global is touched.
  npm_config_prefix="$(native_path "$node_dir")" \
    npm install --global --no-fund --no-audit --no-update-notifier --loglevel=error \
    --cache "$(native_path "$venv/npm-cache")" "pnpm@$pnpm_version"
  echo "Installed in .venv/node"
fi
[ "$(command -v pnpm)" = "$node_bin/pnpm" ] || die "pnpm resolves to $(command -v pnpm) instead of .venv/node/pnpm."

# --- App ----------------------------------------------------------------------

step "Dependencies"
# Uses pnpm-lock.yaml as-is when it matches package.json, and updates it when it
# does not (commit the updated lockfile). Explicit, because CI=true would make
# pnpm refuse to install with an outdated lockfile.
# confirm-modules-purge=false: if node_modules was installed from another pnpm
# store (a manual `pnpm install`), reinstall it without asking, as it holds no data.
pnpm install --no-frozen-lockfile \
  --store-dir "$(native_path "$venv/pnpm-store")" \
  --cache-dir "$(native_path "$venv/pnpm-cache")" \
  --config.confirm-modules-purge=false

step "Settings (.env)"
pnpm run create-env

port_is_free() {
  node -e '
    const server = require("net").createServer()
    server.once("error", () => process.exit(1))
    server.listen(Number(process.argv[1]), () => server.close(() => process.exit(0)))
  ' "$1"
}
# Checked before the build, so a busy port does not waste a few minutes of building.
port_is_free "$port" || die "port $port is already in use. Stop whatever uses it, or run: bash deploy.sh --port 3001"

step "Database"
# --clean: exported, so the build and the app (which also add sample data to an
# empty database) leave it out too. See src/seed/index.ts.
if [ "$clean" = 1 ]; then
  export SAMPLE_DATA=false
  echo "--clean: no sample data is added."
fi
# In production mode Payload never creates or updates database tables, and this
# app has no migrations: like `pnpm dev`, it relies on Payload's schema push.
# So the push runs here, once, outside production mode.
cat >"$venv/init-database.ts" <<'EOF'
// Written by deploy.sh. Creates or updates the database tables and adds the
// sample data to an empty database (unless SAMPLE_DATA=false), as `pnpm dev`
// does when it starts.
import { getPayload } from 'payload'
import configPromise from '../src/payload.config'
import { sampleDataEnabled } from '../src/seed/index'

let finished = false
process.on('exit', (code) => {
  // Payload exits with code 0 when "Accept warnings and push schema to database?" is answered with no.
  if (!finished && code === 0) {
    console.error('The database changes were not applied, so deploy.sh stops here.')
    process.exitCode = 1
  }
})

const config = await configPromise
config.typescript.autoGenerate = false // the build step generates the types; skip Payload's extra background run
const payload = await getPayload({ config })
finished = true
if (!sampleDataEnabled()) {
  const { totalDocs: dogs } = await payload.count({ collection: 'dogs', overrideAccess: true })
  if (dogs > 0) {
    console.log(`The database already has data (${dogs} dog${dogs === 1 ? '' : 's'}); it is kept as it is.`)
    console.log('To start over without sample data, stop the app, then run the deploy command with --teardown, and again with --clean.')
  }
}
console.log('Database is ready.')
process.exit(0)
EOF
NODE_ENV=development pnpm run payload run .venv/init-database.ts

step "Build"
pnpm run build

step "Start"
echo "ShelterWalk is starting on http://localhost:$port (stop it with Ctrl+C)"
exec pnpm run start --port "$port"
