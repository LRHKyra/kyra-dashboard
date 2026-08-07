# Kyra Dashboard

Next.js dashboard for portfolio intelligence and initiative tracking. The
**Pipeline** page is the deal/revenue view served in production at
`https://mac-mini.tarpan-algol.ts.net/app/dashboard/pipeline`.

- **Stack:** Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4 ·
  shadcn/ui (Radix) · Recharts · SWR · Vitest
- **Data:** HubSpot CRM (live), plus local-only sources (filesystem, SQLite, SSH)
  used by the internal-only pages

## Two deployment modes

The app ships one codebase with two very different surfaces, switched by
`DEPLOYMENT_MODE`:

| Mode | Value | What's exposed |
| --- | --- | --- |
| **Cloud** (production) | `cloud` | Only `/pipeline` and `/api/hubspot/pipeline` (+ `/api/version`). Everything else redirects to `/pipeline`. |
| **Local** (dev) | unset / anything else | All pages: pipeline, costs, timeline, agents, memory, safety, config, tasks, PM, etc. |

Gating lives in `src/middleware.ts` and `src/lib/deployment.ts`. The local-only
pages read the developer's own machine (OpenClaw workspace files, SQLite, SSH to
the mac mini) and will simply render empty or error if those aren't present —
that's expected on a fresh clone.

## Getting started

```bash
npm install
cp .env.cloud.example .env.local   # then fill in HUBSPOT_ACCESS_TOKEN
npm run dev                        # http://localhost:3000
```

To reproduce exactly what production shows, set cloud mode in `.env.local`:

```bash
DEPLOYMENT_MODE=cloud
NEXT_PUBLIC_DEPLOYMENT_MODE=cloud
HUBSPOT_ACCESS_TOKEN=pat-na1-...
```

Leave `NEXT_PUBLIC_BASE_PATH` unset locally — it's only needed when the app is
mounted behind a path-prefix gateway.

### Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Dev server |
| `npm run build` | Production build (`output: "standalone"`) |
| `npm start` | Serve a production build |
| `npm test` | Vitest run |
| `npm run test:watch` | Vitest watch |
| `npm run lint` | ESLint |

## Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `HUBSPOT_ACCESS_TOKEN` | Yes (for Pipeline) | HubSpot private-app token, read-only CRM access |
| `DEPLOYMENT_MODE` | Cloud only | `cloud` locks the app down to the Pipeline page (server-side) |
| `NEXT_PUBLIC_DEPLOYMENT_MODE` | Cloud only | Same flag for client-side nav filtering |
| `NEXT_PUBLIC_BASE_PATH` | Behind a gateway | Path prefix, e.g. `/app/dashboard` |
| `LEDGER_API_URL` | Optional | Commission-ledger API, source of truth for contracted revenue |
| `PM_API_URL` | Optional | Backing API for the PM tab (see `docs/PM-TAB.md`) |
| `OPENCLAW_HOME` / `CLAWD_WORKSPACE` | Local only | Workspace paths for the agent/cost/memory pages |
| `SSH_HOST` / `SSH_USER` / `SSH_PORT` / `SSH_KEY_PATH` | Local only | Remote host access for local-mode panels |

Secrets are never committed — `.env*` is gitignored except
`.env.cloud.example`, which holds placeholders only.

## Project layout

```
src/
  app/                    # App Router pages; one directory per nav item
    pipeline/page.tsx     # the Pipeline view
    api/                  # route handlers (api/hubspot/pipeline backs the page)
  components/
    pipeline/             # KPI strip, channel funnels, employer pipeline, contracted revenue
    layout/               # sidebar, header, page shell
    ui/                   # shadcn/ui primitives
  lib/                    # data access, formatting, deployment helpers
  hooks/                  # useApi (SWR wrapper) and friends
scripts/
  deploy-mac-mini.sh      # rsync tracked files → mac mini, build, restart launchd job
  run-mac-mini.sh         # launchd entrypoint for the standalone server
docs/PM-TAB.md
```

The Pipeline page (`src/app/pipeline/page.tsx`) fetches
`/api/hubspot/pipeline` via SWR and auto-refreshes every 5 minutes.

## Deployment

Production runs on the mac mini as a launchd job (`com.kyra.dashboard`) on port
3101, behind a reverse proxy that mounts it at `/app/dashboard`.

```bash
scripts/deploy-mac-mini.sh          # refuses to run with uncommitted changes
scripts/deploy-mac-mini.sh --allow-dirty
```

The script rsyncs only git-tracked files, runs `npm ci && npm run build` on the
host, writes the deployed commit to `.deployed-version`, and kickstarts the
launchd job. It requires SSH access to the mac mini; the remote env file at
`~/.kyra/openclaw-dashboard.env` holds the production secrets and is created on
first deploy from your local `.env.local`.

There is also a second, separate instance running on a laptop — deploying one
does not update the other.

## Testing

```bash
npm test
```

Vitest + Testing Library with a jsdom environment (`vitest.config.ts`).
