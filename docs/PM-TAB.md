# PM Tab — Internal Documentation

## Where It Lives

- **Page**: `/src/app/pm/page.tsx`
- **Components**: `/src/components/pm/`
  - `portfolio-table.tsx` — Filterable initiative table with summary cards
  - `initiative-detail.tsx` — Dialog with full initiative detail + next-step suggestions
  - `alerts-panel.tsx` — Open alerts with acknowledge/resolve/dismiss actions
  - `digest-panel.tsx` — Latest digest rendered as markdown, digest generation
- **API Client**: `/src/lib/pm-api.ts` — Typed SWR hooks + write actions
- **API Proxy**: `/src/app/api/pm/[...path]/route.ts` — Proxies to PM backend
- **Sidebar Entry**: Added to `missionControlItems` in `/src/components/layout/sidebar.tsx`

## How It Talks to the PM API

The frontend never calls the PM backend directly. All requests go through the Next.js API proxy:

```
Browser → /api/pm/initiatives → Next.js proxy → http://127.0.0.1:8000/initiatives
```

The PM backend URL is configurable via `PM_API_URL` environment variable (default: `http://127.0.0.1:8000`).

The client layer in `pm-api.ts` provides:
- **SWR hooks** for reads (cached, auto-revalidating): `useInitiatives`, `useInitiative`, `useAlerts`, `useLatestDigest`, `useDigests`, `useDependencies`
- **Async functions** for writes (with automatic SWR cache invalidation): `refreshPortfolio`, `generateDigest`, `suggestNextStep`, `applyNextStep`, `acknowledgeAlert`, `resolveAlert`, `dismissAlert`

## How to Run Locally

1. Start the PM backend:
   ```bash
   cd ~/kyra-pm-agent
   uv run python -m kyra_pm.api --port 8000
   ```

2. Start the dashboard:
   ```bash
   cd ~/Documents/code/openclaw-dashboard
   npm run dev
   ```

3. Open `http://localhost:3000/pm`

To point at a different PM backend:
```bash
PM_API_URL=http://other-host:8080 npm run dev
```

## What Is Intentionally Not Included

- **Create/edit initiative UI** — First pass is read-heavy. Creation stays in CLI for now.
- **Signal history timeline** — API supports it but not surfaced in the detail dialog yet.
- **Risk/forecast assessment details** — API returns findings but the detail dialog shows only the level, not the breakdown.
- **Kanban/board view** — This is portfolio intelligence, not task management.
- **Dependency graph visualization** — Dependencies shown as text list in detail dialog.
- **Auth** — Internal tool, no authentication layer.
- **Digest history browser** — Only shows latest + summary list. Full history retrieval is available via API.

## Likely Next Improvements

After real use, the most likely additions are:

1. **Signal timeline** in initiative detail — show recent activity
2. **Risk/forecast breakdown** — show the "why" behind red/yellow levels
3. **Quick status change** — move initiatives through states from the table
4. **Create initiative** from the UI
5. **Digest comparison** — compare this week vs last week
6. **Auto-refresh on timer** — re-poll portfolio every 30s
7. **CEO attention filter as default view** — for quick daily check
8. **Toast notifications** for action results (refresh complete, digest generated)
