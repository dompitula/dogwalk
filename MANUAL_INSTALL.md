# ShelterWalk: manual installation

These are the steps to install and run ShelterWalk by hand, with your own Node.js and pnpm. Use them if you want to work on the code (`pnpm dev` reloads the app on every change) or cannot use [`deploy.sh`](README.md), which does all of this for you.

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

- 1 shelter, 4 dogs (Milo, Luna, Charlie, Cooper),
- 13 walks spread over the next 6 days,
- 3 demo bookings by made-up people (`@example.com` addresses).

Dog photos are downloaded from Unsplash; without internet the app uses the "Photo coming soon" placeholders in `src/seed/images`. You can edit or delete all of this in the dashboard or the content manager. Dogs, photos and shelters are added in the content manager (**/admin → Dogs**).

**To start over with a clean database:** stop the app (`Ctrl + C`), delete the `shelter.db` file and the `media` folder in this folder, then run `pnpm dev` again. You will need to create the staff account again (step 2 above).

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

## 6. What was merged and changed

The client site (Next.js 16 + Payload CMS 4 beta) is the base. The admin site was a separate React/Vite app that kept made-up dogs and bookings in the browser; it now lives inside the same app at `/dashboard` and works on the real data.

- **Local backend instead of Figma Cloud.** Both exports came from Figma Make, where the database, file storage and login are provided by Figma's cloud through `@payloadcms/figma`. That cannot run on localhost, so the app now uses a local SQLite file (`shelter.db`), stores uploads in the `media` folder, and uses Payload's normal email/password login. Figma-only files (the `.figma` folder, the Figma image loader, the Figma SSO logout route, Figma Make agent notes) were removed.
- **Staff dashboard on real data.** Overview, Schedule, Dogs, Volunteers and Settings keep the original design. Walks are the `walk-slots` collection, volunteers are the people who booked on the public site, and every change is saved to the database. Dashboard pages and actions require a signed-in staff account (the same accounts as `/admin`).
- **Data model additions** (all optional fields, staff-only):
  - Dogs: `kennel`, `temperament`
  - Walk slots: `route` (approved walking route), `handlingNotes`
  - Bookings: two new statuses, `checked-out` and `returned`
- **Safety rules.** A walk that has a booking cannot be deleted until its booking is deleted (the dashboard does both for you, after asking). Deleting a booking reopens its walk for public booking (unless the walk itself was cancelled). Signed-in staff can add more staff accounts in `/admin`.
- **Adjusted from the original admin design:** "Schedule a walk" creates an open walk (the volunteer is whoever books it); volunteer cards show contact details and walk counts instead of made-up ratings; Settings keeps the default walk duration (saved in the browser) and links to the content manager, the public site and sign out. The two notification switches were removed because nothing in the app sends notifications.

## 7. Project structure

```
src/
  app/
    (frontend)/      public booking site            → /
    (dashboard)/     staff dashboard + sign-in      → /dashboard, /dashboard/login
    (payload)/       Payload CMS admin and API      → /admin, /api
  collections/       data model (Dogs, Shelters, WalkSlots, Bookings, Admins, Media, …)
  lib/walks.ts       walk statuses, routes and labels shared by the server and the dashboard
  seed/              sample data added to an empty database
  payload.config.ts  Payload configuration (SQLite database, collections)
scripts/create-env.mjs  creates .env
deploy.sh               one-step production deploy (see README.md)
deploy.cmd              runs deploy.sh with Git Bash from PowerShell or Command Prompt
```

Other commands: `pnpm generate:types` regenerates `src/payload-types.ts`, `pnpm generate:importmap` regenerates the CMS import map, `pnpm format` formats the code.
