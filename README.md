# ShelterWalk: shelter dog walking app

One Next.js app with a public booking site, a staff dashboard and a content manager (Payload CMS), all on the same database.

`deploy.sh` installs and starts the whole app with one command. To install it step by step instead, or to work on the code with `pnpm dev`, see **[MANUAL_INSTALL.md](MANUAL_INSTALL.md)**. That file also covers the sample data, the walk flow, troubleshooting and the project structure.

---

## Deploy with `deploy.sh`

`deploy.sh` brings its own Node.js and pnpm and keeps them in a `.venv` folder inside this project. You don't need to install Node.js or pnpm, and any versions already on the computer are not used or changed.

### Requirements

- **Windows** with [Git for Windows](https://git-scm.com/download/win) installed (it includes Git Bash, which the script runs in), or **Linux** (x64 or arm64)
- On Linux: `curl` and `tar`, which most distributions already include. On Windows, Git Bash brings everything the script needs.
- An internet connection

### Run it

Open a terminal in this folder (the one with `package.json`) and run the command for your terminal:

| System | Terminal | Command |
| --- | --- | --- |
| Windows | PowerShell or Command Prompt | `.\deploy.cmd` |
| Windows | Git Bash | `bash deploy.sh` |
| Linux | any | `bash deploy.sh` |

On Windows, don't type `bash deploy.sh` in PowerShell or Command Prompt: there, `bash` starts WSL instead of Git Bash. `deploy.cmd` finds Git Bash and runs `deploy.sh` with it.

The first run takes a few minutes. The app is up when the terminal shows `✓ Ready`:

| Part | URL | Who it is for |
| --- | --- | --- |
| Public booking site | http://localhost:3000 | Visitors who want to walk a shelter dog |
| Staff dashboard | http://localhost:3000/dashboard | Shelter staff: schedule walks, confirm bookings, track walks |
| Content manager | http://localhost:3000/admin | Shelter staff: dogs, photos, shelters, walks, bookings, staff accounts |

On the first visit, open http://localhost:3000/admin and fill in the **create first user** form. That account signs you in to both the dashboard and the content manager. To get from the content manager to the dashboard, use **← Staff dashboard** at the top of its sidebar.

Keep the terminal open while the app is in use, and stop the app with `Ctrl + C` (with `deploy.cmd`, then answer `Y` to "Terminate batch job?"). To start it again, or to deploy a new version of the code, run the same command again. Steps that are already done are skipped, and your data is kept.

### Options

| Option | What it does |
| --- | --- |
| `--port PORT` | Serves the app on another port, for example `.\deploy.cmd --port 8080` or `bash deploy.sh --port 8080`. The default is 3000, or the `PORT` environment variable if it is set. |
| `--clean` | Starts without the sample data, for example `.\deploy.cmd --clean`. Only an empty database is affected: a database that already has data is kept as it is, so to drop the sample data, run `--teardown` first. With an empty database, add a shelter first and then the dogs, in the content manager. |
| `--teardown` | Deletes the app's data and everything `deploy.sh` installed, after asking. The app is not started. See [Remove the app and its data](#remove-the-app-and-its-data). |
| `--yes` | With `--teardown`: deletes without asking. |
| `-h`, `--help` | Shows the usage and exits. |

### What it does

| Step | What happens |
| --- | --- |
| Node.js | Downloads the Node.js version pinned in `.mise.toml` (currently 24.22.1) from nodejs.org into `.venv/node` and checks its SHA-256 checksum. Skipped when that version is already there. |
| pnpm | Installs the pnpm version pinned in `package.json` (currently 10.34.3) into `.venv/node` with npm. Corepack is not used. Skipped when that version is already there. |
| Dependencies | Runs `pnpm install` with pnpm's package store in `.venv/pnpm-store`. If `pnpm-lock.yaml` no longer matches `package.json`, pnpm updates it; commit the updated file. |
| Settings | Creates `.env` with a random `PAYLOAD_SECRET` if it does not exist yet. An existing `.env` is never changed. |
| Database | Creates or updates the tables in `shelter.db`, and fills an empty database with sample data (1 shelter, 3 dogs, 10 walks, 3 demo bookings), unless you add `--clean`. If a code change would delete data, Payload asks first; answering no stops the deploy. |
| Build | Runs `pnpm run build`, the production build. Payload's build also regenerates `src/payload-types.ts` from the collections; commit that file if it changed. |
| Start | Runs `pnpm run start` on the chosen port. |

### Remove the app and its data

Stop the app (`Ctrl + C`), then run the command for your terminal:

| Terminal | Command |
| --- | --- |
| PowerShell or Command Prompt | `.\deploy.cmd --teardown` |
| Git Bash, or Linux | `bash deploy.sh --teardown` |

It lists what it will delete and waits for you to type `yes`. Only what exists is listed:

| Deleted | What it is |
| --- | --- |
| `shelter.db` | The database: dogs, walks, bookings and staff accounts. If `DATABASE_URL` in `.env` names another file, that file. |
| `media` | Uploaded photos |
| `.env` | Settings, including `PAYLOAD_SECRET` |
| `.venv`, `node_modules`, `.next` | Node.js, pnpm, the dependencies and the build |

This can't be undone, so back up `shelter.db`, `media` and `.env` first if you might need them. The code is not touched. Afterwards, run the deploy command again for a fresh start, with `--clean` if you don't want the sample data. Or delete the folder to remove the app completely.

### Good to know

- **Your data** is in `shelter.db` (the database) and the `media` folder (uploaded photos). Back up these two and `.env`. Running `deploy.sh` again keeps all three.
- **Nothing you create is committed.** `.gitignore` keeps out the database (under any name or folder, including backup copies such as `shelter.db.bak`), `media`, `.env`, `.venv`, `node_modules` and `.next`. The only data in the repository is the sample data in `src/seed`.
- **Public address:** if people reach the app through a domain, set `NEXT_PUBLIC_SITE_URL` in `.env` (for example `https://walks.example.org`) and run `deploy.sh` again. The address is built into the pages' metadata.

### Troubleshooting

| Problem | Fix |
| --- | --- |
| `port 3000 is already in use` | Another program uses that port. Stop it, or add another port to the command, for example `--port 3001`. |
| `WSL ... ERROR: CreateProcessCommon ... execvpe(/bin/bash) failed`, or `bash` opens WSL or says no Linux distribution is installed | You typed `bash deploy.sh` in PowerShell or Command Prompt, where `bash` starts WSL. Run `.\deploy.cmd` instead (see [Run it](#run-it)). |
| `deploy.cmd: Git Bash was not found` | Install [Git for Windows](https://git-scm.com/download/win), open a new terminal and run `.\deploy.cmd` again. |
| `this Windows folder was opened through WSL` | Same cause as the WSL error above: run `.\deploy.cmd` in PowerShell or Command Prompt, or `bash deploy.sh` in Git Bash. |
| `$'\r': command not found` | `deploy.sh` has Windows line endings. Fix the file once with `sed -i 's/\r$//' deploy.sh`. `.gitattributes` keeps it correct in future checkouts. |
| `could not delete …` or `ShelterWalk is still running` during `--teardown` | The app is still running. Stop it with `Ctrl + C` in its terminal and run the teardown again; it carries on with what is left. |
| `could not download Node.js` | Check the internet connection (and proxy, if you use one) and run `deploy.sh` again. |
| Anything else | Delete `.venv` and `node_modules` and run the deploy command again for a clean install. For app errors, see the troubleshooting section of [MANUAL_INSTALL.md](MANUAL_INSTALL.md#5-troubleshooting). |
