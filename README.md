# turso-starter

Vercel's [Next.js + Turso starter](https://github.com/vercel/next.js/tree/canary/examples/with-turso)
— a todo list whose server actions insert and delete rows in SQLite —
running on **Cloudflare Workers + Static Assets** through
[`@opennextjs/cloudflare`](https://opennext.js.org/cloudflare), with the
todos in a **Cloudflare D1** database provisioned by Terraform through
[Orun](https://github.com/sourceplane/orun), inside the repository
conventions of the [Cirrus baseline](https://github.com/sourceplane/cirrus-baseline).

Turso and D1 are both SQLite, so the SQL does not change; `lib/turso.ts`
keeps the libSQL client's `execute()` shape over the D1 binding. See
[`specs/epics/turso-starter`](specs/epics/turso-starter/README.md) for the
design, the milestones and the as-built status.

## What is here

| Surface | Where |
|---|---|
| The page, the form, the list and the server actions | `apps/web/app` |
| The client (libSQL's `execute` shape over D1) | `apps/web/lib/turso.ts` |
| Workers build, bindings and deploy contract | `apps/web/next.config.mjs`, `open-next.config.ts`, `wrangler.template.jsonc` + `wiring.fixture.json`, `component.yaml` |
| The D1 database (stage, prod) | `infra/terraform/cloudflare-d1` |
| Tests | `tests/web` (vitest, against an in-memory D1) |

## Getting started

```bash
pnpm install
pnpm run wire:fixture   # render apps/web/wrangler.jsonc from the offline fixture
pnpm typecheck
pnpm lint
pnpm test
pnpm build              # next build + opennextjs-cloudflare build → apps/web/.open-next
```

```bash
pnpm --filter @app/web dev        # http://localhost:3000 — a local D1 through wrangler's platform proxy
pnpm --filter @app/web preview    # wrangler dev over the built Worker, same local D1
```

The `todos` table is created on first use, as upstream does.

## How it maps to Vercel

| Vercel-side | Here |
|---|---|
| Next.js hosting, server actions | One Cloudflare Worker (`.open-next/worker.js`) + Static Assets |
| Turso (`@libsql/client`, `TURSO_DB_URL`/`TOKEN`) | D1 `DB` binding; the id and name are rendered into `wrangler.jsonc` per environment from the Terraform root's wiring document |
| `file:./dev.db` locally | wrangler's local D1 |
| Deploy on push | Orun deploys `turso-starter-web-{stage,prod}` on merge to `main` (`apps/web/component.yaml`) |

## Deploying

`.github/workflows/checks.yml` runs install, wire, typecheck, lint, test and
build on every push and pull request. `ci.yml` is the Orun pipeline: set
`execution.state.workspace` in `intent.yaml` to this product's workspace
(`orun cloud link`), connect a Cloudflare account whose token can mint the
D1 scope, and set the `ORUN_CI` repository variable to `true`. A merge to
`main` then applies the D1 root, renders the Worker's config with the real
database id, and deploys to `stage`, then `prod`.
