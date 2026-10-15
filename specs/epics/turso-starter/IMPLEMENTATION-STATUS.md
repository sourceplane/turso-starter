# turso-starter (TU) — Implementation status

As-built ≠ intent. This file records what actually shipped, and every place
the code departed from `design.md` or from the upstream template.

| Milestone | State | PR |
|---|---|---|
| TU0 — the spec | ✅ Shipped | [#1](https://github.com/sourceplane/turso-starter/pull/1) |
| TU1 — the todos on D1 | ✅ Shipped | [#2](https://github.com/sourceplane/turso-starter/pull/2) |
| TU2 — the D1 database from Terraform | ✅ Shipped (validated; apply gated on a linked workspace) | [#3](https://github.com/sourceplane/turso-starter/pull/3) |
| TU3 — ready to instantiate | ✅ Shipped | [#4](https://github.com/sourceplane/turso-starter/pull/4) |
| TU4 — a baseline | 🟡 In review | this PR |

## Departures from the upstream template

### The site's name and source link live in `lib/site.ts` (TU4)

Upstream's page is headed "Turso" (the port's: "D1") and titled
"Next.js + Turso". Both now read `SITE_NAME`, and a "source" link under the
heading reads `SOURCE_URL`, so the rename can make a copy somebody else's in
two literals. Upstream's `apps/web/README.md` (Turso setup) is replaced by
one about this site.

### `lib/turso.ts` speaks to D1

`createClient({ url, authToken })` from `@libsql/client` became a client
with the same `execute()` shape over `getCloudflareContext().env.DB`. No
`@libsql/client`, no `TURSO_DB_*`, no `dev.db`.

### `dynamic = "force-dynamic"` on `app/page.tsx`

Upstream's page is pre-rendered at build and refreshed by
`revalidatePath('/')` through ISR. The Worker serves pre-rendered pages
from a read-only static-assets cache, so a pre-rendered list would never
show a new todo; the page renders on every request instead (the actions
still call `revalidatePath`, now a no-op).

### `next.config.mjs` with `initOpenNextCloudflareForDev()`, standalone output

### Page copy

"Turso" → "D1"; the layout title → "Next.js + D1".

### Next 16.3.8, React 19, eslint-config-next 16 flat config (`react-hooks/refs` off)

The template floated `next: latest` with React 18 and `eslint-config-next 14`.

## Verified

- Local: `pnpm run wire:fixture`, `pnpm typecheck`, `pnpm lint`, `pnpm test`
  (3 tests), `pnpm build` green; `wrangler dev` with a local D1: `/` 200
  ("Insert new todo", the table created on first render), a row inserted
  with `wrangler d1 execute --local` shows on the next request.
- `terraform validate` green on `infra/terraform/cloudflare-d1`.
- CI: `Checks` green on #2 and #3.
- Not verified: the D1 apply and a live deploy — both need the product
  linked to an Orun workspace with a Cloudflare connection whose token can
  mint the D1 scope (`ORUN_CI`); the form's server actions in a browser
  (they are exercised by the tests).

## Verified (TU4)

- Locally, orun 2.75.0: `testing/{manifest,phases,coverage,rebrand,retouch,bootstrap-defer}.test.sh`,
  `testing/leak.test.sh`, `testing/placement.test.sh` (the offline bootstrap of
  `acme-todos`, "Sam's Notes & Links", all four phases; the D1 root and the
  site's D1 wiring re-tenanted; the site's own `orun plan` at `03-site`) and
  `testing/e2e.test.sh` (that site's Checks; its stage lane's build — with the
  wiring document the runner would resolve — verify and dry-run deploy in the
  staged tree; `wrangler dev`; the component's own smoke; a todo added,
  listed and removed through D1) all green; the repository's own
  `pnpm typecheck`, `lint`, `test` and `build` green.
- Not verified: a live bootstrap (risks TU-E), and orun at the CI pins
  (v2.58.11 and v2.78.4) — Baseline CI runs both on this pull request.

## Versions

| Package | Version | Why |
|---|---|---|
| next | 16.3.8 | newest inside `@opennextjs/cloudflare` 1.20.11's peer range |
| @opennextjs/cloudflare | ^1.20.11 | `getCloudflareContext` for the binding |
| wrangler | ^4.151.0 | compatibility_date 2026-10-01 |
