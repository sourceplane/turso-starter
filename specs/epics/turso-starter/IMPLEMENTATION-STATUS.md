# turso-starter (TU) — Implementation status

As-built ≠ intent. This file records what actually shipped, and every place
the code departed from `design.md` or from the upstream template.

| Milestone | State | PR |
|---|---|---|
| TU0 — the spec | ✅ Shipped | [#1](https://github.com/sourceplane/turso-starter/pull/1) |
| TU1 — the todos on D1 | ✅ Shipped | [#2](https://github.com/sourceplane/turso-starter/pull/2) |
| TU2 — the D1 database from Terraform | ✅ Shipped (validated; apply gated on a linked workspace) | [#3](https://github.com/sourceplane/turso-starter/pull/3) |
| TU3 — ready to instantiate | ✅ Shipped | [#4](https://github.com/sourceplane/turso-starter/pull/4) |

## Departures from the upstream template

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

## Versions

| Package | Version | Why |
|---|---|---|
| next | 16.3.8 | newest inside `@opennextjs/cloudflare` 1.20.11's peer range |
| @opennextjs/cloudflare | ^1.20.11 | `getCloudflareContext` for the binding |
| wrangler | ^4.151.0 | compatibility_date 2026-10-01 |
