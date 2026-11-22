# The Good Walk: manual installation

These are the steps to install and run The Good Walk by hand, with your own Node.js and pnpm. Use them if you want to work on the code (`pnpm dev` reloads the app on every change) or cannot use [`deploy.sh`](README.md), which does all of this for you.

The app contains three parts, all using the same database:

| Part | URL (when running locally) | Who it is for |
| --- | --- | --- |
| Public booking site (was the "client site") | http://localhost:3000 | Visitors who want to walk a shelter dog |
| Staff dashboard (was the "admin site") | http://localhost:3000/dashboard | Shelter staff: schedule walks, confirm bookings, track walks |
| Content manager (Payload CMS) | http://localhost:3000/admin | Shelter staff: dogs, photos, shelters, walks, bookings, staff accounts |

A walk booked on the public site shows up in the dashboard straight away, and a walk scheduled in the dashboard can be booked on the public site.

---

## 1. Requirements

- **Node.js 24.22.1 or newer.** Payload 4 (the CMS this app uses) needs it. Check with:
  ```bash
  node -v
  ```
  If the version is lower, install the current Node.js 24 LTS from https://nodejs.org.
- **pnpm 10** (the project's package manager). Install it once with either:
  ```bash
  corepack enable
  ```
  or, if that fails (on Windows `corepack enable` needs a terminal opened as Administrator):
  ```bash
  npm install -g pnpm@10
  ```
  Check with `pnpm -v`. The project pins pnpm 10.34.3; if Corepack asks whether to download it, answer `Y`.
- An internet connection for the first install.

## 2. Launch on localhost

Open a terminal in this folder (the one that contains `package.json`) and run:

```bash
pnpm install
pnpm run create-env
pnpm dev
```

| Command | What it does |
| --- | --- |
| `pnpm install` | Downloads the dependencies (a few minutes the first time). |
| `pnpm run create-env` | Creates the `.env` file with a random `PAYLOAD_SECRET`. Run it once; it never overwrites an existing `.env`. |
| `pnpm dev` | Starts the app at http://localhost:3000. Leave this terminal open; stop the app with `Ctrl + C`. |

Then, in the browser:

1. Open **http://localhost:3000**. The first load can take a minute: the app is compiled, and the database file `shelter.db` is created and filled with sample data (see section 4). The terminal prints `Seed: added …` when the sample data is in.
2. Open **http://localhost:3000/admin** and fill in the **create first user** form (email and password). This is your staff account.
3. Open **http://localhost:3000/dashboard**, or use **← Staff dashboard** at the top of the content manager's sidebar. You are already signed in from step 2. Later you can sign in at http://localhost:3000/dashboard/login, or with the "Shelter login" link in the footer of the public site.

Next time you only need `pnpm dev`.

## 3. Try the whole flow

1. On the public site, pick a dog, press **Book this walk** and fill in the form.
2. In the dashboard (**Schedule**), go to that day: the walk now shows the visitor as volunteer with status **Pending**. Change it to **Scheduled** when the shelter confirms, then **Checked Out** and **Returned** on the day.
3. In the dashboard, press **Schedule a walk**, choose a dog, date and time. The new walk appears on the public site, ready to be booked.

Walk statuses in the dashboard:

| Status | Meaning |
| --- | --- |
| Needs Volunteer | Open walk that nobody has booked yet (bookable on the public site). Choosing it for a booked walk removes the booking and reopens the walk. |
| Pending | A visitor booked it; the shelter has not confirmed yet. |
| Scheduled | Booking confirmed by the shelter. |
| Checked Out | The dog is out on the walk. |
| Returned | Walk finished. |
| Cancelled | Walk or booking cancelled; hidden from the public site. |

## 4. Sample data and resetting

On the very first start (a database with no staff accounts and no dogs) the app adds:

- 1 shelter, 3 dogs (Milo, Luna, Cooper),
- 10 walks spread over the next 6 days,
- 3 demo bookings by made-up people (`@example.com` addresses).

Dog photos are downloaded from Unsplash; without internet the app uses the "Photo coming soon" placeholders in `src/seed/images`. You can edit or delete all of this in the dashboard or the content manager. Dogs, photos and shelters are added in the content manager (**/admin → Dogs**).

**To start without the sample data**, add `SAMPLE_DATA=false` to `.env` before the first start (`deploy.sh --clean` does the same). It only affects an empty database: existing data is never removed. With an empty database, add a shelter first and then the dogs, in the content manager.

**To start over with a clean database:** stop the app (`Ctrl + C`), delete the `shelter.db` file and the `media` folder in this folder, then run `pnpm dev` again. You will need to create the staff account again (step 2 above). `bash deploy.sh --teardown` does this for you, and also deletes `.env`, `.venv`, `node_modules` and `.next` (see [README.md](README.md#remove-the-app-and-its-data)). None of this data is ever committed: `.gitignore` keeps it out.

## 5. Troubleshooting

| Problem | Fix |
| --- | --- |
| `Error: Cannot find matching keyid` when running `pnpm` | The Corepack that comes with older Node.js versions (for example 22.12) does not know npm's current signing key. Install Node.js 24.22.1 or newer (section 1) and open a new terminal. If it still happens, update Corepack in a terminal opened as Administrator: `npm install -g corepack@latest`. Or use [`deploy.sh`](README.md), which does not use Corepack. |
| `pnpm install` says the modules directory "will be removed and reinstalled from scratch" | `node_modules` was installed by `deploy.sh`, which uses its own package store in `.venv`. Answer `Y`; nothing is lost. |
| `Error: missing secret key` | The `.env` file is missing or `PAYLOAD_SECRET` is empty. Run `pnpm run create-env`. |
| `pnpm` is not recognised | Install pnpm (section 1), then open a new terminal. |
| Windows PowerShell says "running scripts is disabled on this system" | Use Command Prompt (`cmd`) instead, or allow local scripts once with `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` and open a new terminal. |
| Warning or errors about an unsupported Node.js version | Install Node.js 24.22.1 or newer, open a new terminal, delete the `node_modules` folder and run `pnpm install` again. |
| Port 3000 is already in use | Next.js then uses the next free port and prints the address in the terminal (for example http://localhost:3001); open that one. To choose a port yourself: `pnpm dev --port 3001`. |
| The public site says "No matching walks right now" | All sample walks are booked, cancelled or in the past. Schedule new walks in the dashboard, or reset the database (section 4). |
| After changing a collection's fields, the terminal asks whether to apply database changes | That is Payload updating the local database. Read the question and answer in the terminal. |

## 6. Tests, lint and CI

Run these in the project folder, after `pnpm install`:

| Command | What it does |
| --- | --- |
| `pnpm format` | Formats the code with oxfmt. |
| `pnpm format:check` | Checks the formatting without changing any file. Markdown and the generated files (`src/payload-types.ts`, the import map) are left as they are. |
| `pnpm lint` | Checks the code with oxlint, with the rules in `.oxlintrc.json`. Every rule is either an error or off, and the file says why each rule that is off is off. |
| `pnpm lint:fix` | Fixes what oxlint can fix by itself. |
| `pnpm typecheck` | Generates the route types (`next typegen`) and checks the types of the app and the tests. |
| `pnpm test` | Runs the unit tests and the integration tests. |
| `pnpm test:unit` | Unit tests only (`tests/unit`): no database and no network. They take about a second. |
| `pnpm test:integration` | Integration tests only (`tests/integration`): the real app (Payload's Local API and the server actions) on a throwaway database. They take about 15 seconds. |
| `pnpm test:watch` | Runs the tests again on every change. |
| `pnpm check` | Format check, lint, type check and tests: everything CI checks except the build and the deploy. Run it before you push. |

`pnpm test:coverage` also writes a coverage report to `coverage/`. Coverage is not checked.

**The tests leave your data alone.** They need no `.env` and never open `shelter.db` or the `media` folder: each integration test file gets its own database and photo folder in `.tmp-tests/`, which the next test run deletes. No test sends email or reaches the internet. A test that tries to fails.

On Windows, running a single test file (for example `pnpm vitest run bookings`) fails with "Vitest failed to find the current suite" when the terminal's folder starts with a lowercase drive letter (`c:\…`), which VS Code terminals sometimes do. Change to the same folder written with a capital letter (`cd C:\…`) and run it again. `pnpm test` is not affected.

### What CI checks

Every pull request, and every push to `main`, runs the workflow in `.github/workflows/ci.yml`. It uses the Node.js version from `.mise.toml` and the pnpm version from `package.json`, the same ones `deploy.sh` installs.

| Check | What it does |
| --- | --- |
| Format, lint, types, build | `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, shellcheck on `deploy.sh`, and `pnpm build`. Then it checks that the build really finished, and that `src/payload-types.ts` and the import map are committed as the build generates them. |
| Tests (ubuntu-latest), Tests (windows-latest) | The unit and integration tests, on Linux and on Windows. |
| out_of_box (ubuntu-latest), out_of_box (windows-latest) | What a new user gets: `deploy.sh` (`deploy.cmd` on Windows) from a clean checkout, without caches. When the app answers, it checks the public site, the dashboard sign-in, the content manager and the API, then stops the app, runs `--teardown --yes` and checks that everything was removed. The script is `scripts/ci/out_of_box.mjs`. |
| CI result | Passes only when all the checks above passed. |

A pull request can only be merged into `main` once **CI result** passes.

When a check fails, open it from the pull request's **Checks** tab. The output of the failing step says why, and lint errors and failed tests are also shown on the lines they concern, under **Files changed**. A failed out_of_box run attaches the whole deploy output: download the `out_of_box-log-ubuntu-latest` or `out_of_box-log-windows-latest` artifact from the run's summary page, which also shows the table of checks.

Two failures that are not about your change:

- **A security advisory for Next.js.** When Next.js publishes an advisory for the version in `package.json`, `next build` stops without building and prints `Upgrade: Next.js … → 16.x.y` (see "the build did not finish" in the [README's troubleshooting](README.md#troubleshooting)). CI then fails on every pull request until `next` is updated to that version. This is on purpose: it keeps a known vulnerable Next.js from being shipped.
- **Generated files out of date.** After changing a collection or an admin component, run `pnpm build` (or `pnpm generate:types` and `pnpm generate:importmap`) and commit `src/payload-types.ts` and `src/app/(payload)/admin/importMap.js`.

The out_of_box script ends with `--teardown --yes`, which deletes the database, `media` and `.env`, so it refuses to run outside CI. To run it on your computer, use a throwaway clone: `git clone . ../good-walk-test`, then `node scripts/ci/out_of_box.mjs --allow-teardown` in that folder.

## 7. What was merged and changed

The client site (Next.js 16 + Payload CMS 4 beta) is the base. The admin site was a separate React/Vite app that kept made-up dogs and bookings in the browser; it now lives inside the same app at `/dashboard` and works on the real data.

- **Local backend instead of Figma Cloud.** Both exports came from Figma Make, where the database, file storage and login are provided by Figma's cloud through `@payloadcms/figma`. That cannot run on localhost, so the app now uses a local SQLite file (`shelter.db`), stores uploads in the `media` folder, and uses Payload's normal email/password login. Figma-only files (the `.figma` folder, the Figma image loader, the Figma SSO logout route, Figma Make agent notes) were removed.
- **Staff dashboard on real data.** Overview, Schedule, Dogs, Volunteers and Settings keep the original design. Walks are the `walk-slots` collection, volunteers are the people who booked on the public site, and every change is saved to the database. Dashboard pages and actions require a signed-in staff account (the same accounts as `/admin`).
- **Data model additions** (all optional fields, staff-only):
  - Dogs: `kennel`, `temperament`
  - Walk slots: `route` (approved walking route), `handlingNotes`
  - Bookings: two new statuses, `checked-out` and `returned`
- **Safety rules.** A walk that has a booking cannot be deleted until its booking is deleted (the dashboard does both for you, after asking). Deleting a booking reopens its walk for public booking (unless the walk itself was cancelled). Signed-in staff can add more staff accounts in `/admin`.
- **Adjusted from the original admin design:** "Schedule a walk" creates an open walk (the volunteer is whoever books it); volunteer cards show contact details and walk counts instead of made-up ratings; Settings keeps the default walk duration (saved in the browser) and links to the content manager, the public site and sign out. The two notification switches were replaced by **Email settings** (`/dashboard/email`, linked from Settings), where staff turn the booking emails on and set the sender.

## 8. Project structure

```
src/
  app/
    (frontend)/      public booking site            → /
    (dashboard)/     staff dashboard + sign-in      → /dashboard, /dashboard/login
      dashboard/       dashboard-app.tsx (layout and navigation), views/ (one file per view),
                       dialogs/, use-dashboard.ts (data and actions), walk-view.ts (helpers),
                       email/ (Email settings page → /dashboard/email)
    (payload)/       Payload CMS admin and API      → /admin, /api
    tokens.css       design tokens (colours, fonts, shadows) shared by both sites
    fonts.ts         the fonts, bundled with the app by next/font
  collections/       data model (Dogs, Shelters, WalkSlots, Bookings, Admins, Media)
  globals/           Email settings, saved by the Email settings page
  components/
    icon.tsx         the icon set used by both sites
    admin/           content manager additions: the dashboard links and the dog form fields
  lib/
    walks.ts         walk statuses, routes and labels shared by the server and the dashboard
    booking-rules.ts what a booking must contain, checked by the booking form and the Bookings collection
    brand.ts         the app's name
    ids.ts           reads database IDs sent by the browser or held by relationships
    dog-options.ts   the choices in the dog form (kennels, ages, temperaments, special care)
    email/           booking emails, sent through Resend (RESEND_API_KEY in .env)
  seed/              sample data added to an empty database
  payload.config.ts  Payload configuration (SQLite database, collections, email)
tests/
  unit/              unit tests: no database, no network
  integration/       integration tests on a throwaway database; setup.ts and helpers/ are the harness
scripts/create-env.mjs     creates .env
scripts/ci/out_of_box.mjs  CI's deploy test: deploys, checks the app, tears it down (section 6)
deploy.sh               one-step production deploy, and --teardown (see README.md)
deploy.cmd              runs deploy.sh with Git Bash from PowerShell or Command Prompt
vitest.config.ts        the test projects: unit and integration
.oxlintrc.json          the lint rules
.github/workflows/ci.yml  the CI workflow (section 6)
.github/actions/setup/  CI's setup of Node.js, pnpm and the dependencies
```

Colours are design tokens: add or change them in `src/app/tokens.css`, never as a colour value in a component or stylesheet (Tailwind's default colours are switched off). The one exception is the HTML of the booking emails (`src/lib/email/booking-email.ts`): email clients do not support CSS variables.

Other commands: `pnpm generate:types` regenerates `src/payload-types.ts`, and `pnpm generate:importmap` regenerates the CMS import map. Formatting, lint, the type check and the tests are in section 6.
