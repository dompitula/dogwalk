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
# Usage: bash deploy.sh [--port PORT]

set -euo pipefail

usage() {
  cat <<'EOF'
Usage: bash deploy.sh [--port PORT]
       .\deploy.cmd [--port PORT]   (Windows: PowerShell or Command Prompt)

Installs Node.js and pnpm into .venv/, installs the app's dependencies,
creates .env if it does not exist yet, builds the app and starts it in
production mode. Stop the app with Ctrl+C.

Options:
  --port PORT   Port to serve the app on (default: $PORT, or 3000)
  -h, --help    Show this help and exit
EOF
}

die() { printf '\ndeploy.sh: %s\n' "$*" >&2; exit 1; }
step() { printf '\n==> %s\n' "$*"; }

port="${PORT:-3000}"
while [ $# -gt 0 ]; do
  case "$1" in
    --port) [ $# -ge 2 ] || die "--port needs a value, for example --port 8080"; port="$2"; shift 2 ;;
    --port=*) port="${1#--port=}"; shift ;;
    -h | --help) usage; exit 0 ;;
    *) usage >&2; die "unknown option: $1" ;;
  esac
done
case "$port" in '' | *[!0-9]*) die "the port must be a number, got '$port'" ;; esac

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
# In production mode Payload never creates or updates database tables, and this
# app has no migrations: like `pnpm dev`, it relies on Payload's schema push.
# So the push runs here, once, outside production mode.
cat >"$venv/init-database.ts" <<'EOF'
// Written by deploy.sh. Creates or updates the database tables and adds the
// sample data to an empty database, as `pnpm dev` does when it starts.
import { getPayload } from 'payload'
import configPromise from '../src/payload.config'

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
await getPayload({ config })
finished = true
console.log('Database is ready.')
process.exit(0)
EOF
NODE_ENV=development pnpm run payload run .venv/init-database.ts

step "Build"
pnpm run build

step "Start"
echo "ShelterWalk is starting on http://localhost:$port (stop it with Ctrl+C)"
exec pnpm run start --port "$port"
