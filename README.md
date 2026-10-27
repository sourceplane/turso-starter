# turso-starter

Vercel's [Next.js + Turso starter](https://github.com/vercel/next.js/tree/canary/examples/with-turso)
— a todo list whose server actions insert and delete rows in SQLite —
running on **Cloudflare Workers + Static Assets** through
[`@opennextjs/cloudflare`](https://opennext.js.org/cloudflare), with the
todos in a **Cloudflare D1** database provisioned by Terraform through
[Orun](https://github.com/sourceplane/orun) and its schema applied by
migrations, and packaged as an **Orun baseline**: one command takes a new
product from nothing to live on stage and prod, in its own repository,
under its own name — in ONE landing.

Turso and D1 are both SQLite, so the SQL does not change; `lib/turso.ts`
keeps the libSQL client's `execute()` shape over the D1 binding. The table
the template created on first use is a migration here, applied before the
Worker deploys. What the baseline adds is everything needed to make a copy
of it somebody else's, built the way
[cirrus-baseline](https://github.com/sourceplane/cirrus-baseline) is since
its one-landing bootstrap. See
[`specs/epics/turso-starter`](specs/epics/turso-starter/README.md) for the
design, the milestones and the as-built status.

## Instantiating a product

```bash
git clone --depth 1 --branch <baseline-tag> https://github.com/sourceplane/turso-starter
cd turso-starter
orun new --blueprint repo-blueprint.yaml --out ~/sites/acme-todos --run-hooks --resume \
  --set reponame=acme-todos --set productname="Acme Todos" \
  --set githuborg=acme-inc --set subdomain=<workers-dev-subdomain>
```

Or, once the platform's registry lists it, from the Orun console (Baselines →
`turso-starter` → Build). Two phases: **`01-product`** creates the
repository and lands the whole product as ONE pull request — intent, CI,
tooling, the D1 root, the migrations, the site and its tests — and one
convergence, per environment, applies the D1 database, then its migrations,
then deploys the site with its id; **`02-docs`** records the live deployment
from probed facts. **[BOOTSTRAP.md](BOOTSTRAP.md)** is the operator guide;
[docs/phases/](docs/phases/README.md) has a page per phase.

The new repository receives the **product only** — the app, its D1 root, its
migrations and their runner, its tests, its CI, its tooling, a README of its
own and its operating contract — renamed throughout to the product's name,
repository, Cloudflare Worker and database names. None of this repository's
machinery ships.

| What makes it a baseline | Where |
|---|---|
| The console card (inputs, secrets, programme) | `blueprint.yaml` |
| The build document (modules, phases, hooks) | `repo-blueprint.yaml` |
| This tree's identity, and the bootstrap's task contracts | `.baseline/` |
| The rename engine | `tooling/rebrand/rebrand.mjs` |
| The bootstrap's helpers (deferrals, redeploy marker, work-tree strip) | `tooling/bootstrap/` |
| The deployment-record renderer | `hooks/render-deployment-docs.sh` |
| The product's README and context pack | `.baseline/product/README.md`, `ai/context/` |
| The baseline's tests: contract, wiring, leak, offline bootstrap, end to end | `testing/`, `.github/workflows/baseline.yml` |
| Cutting a `baseline-vN` tag | `.github/workflows/tag.yml` |

## What is here (the product)

| Surface | Where |
|---|---|
| The page, the form, the list and the server actions | `apps/web/app` |
| The site's name and source link | `apps/web/lib/site.ts` |
| The client (libSQL's `execute` shape over D1) | `apps/web/lib/turso.ts` |
| Workers build, bindings and deploy contract | `apps/web/next.config.mjs`, `open-next.config.ts`, `wrangler.template.jsonc` + `wiring.fixture.json` (→ the committed `wrangler.jsonc`), `component.yaml` |
| The D1 database (stage, prod) | `infra/terraform/cloudflare-d1` |
| The schema (migrations) and the runner that applies them over the D1 REST API | `packages/db`, run by `infra/db-migrate` |
| The wrangler renderer, the migration helpers | `tooling/wire`, `tooling/migrations` |
| Tests | `tests/web` (the list and the actions, an in-memory D1), `tests/db` (the migrations through the runner, into real SQLite) |

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
pnpm --filter @app/web db:migrate:local   # create the todos table in wrangler's local D1
pnpm --filter @app/web dev                # http://localhost:3000 — the local D1 through wrangler's platform proxy
pnpm --filter @app/web preview            # wrangler dev over the built Worker, same local D1
```

## How it maps to Vercel

| Vercel-side | Here |
|---|---|
| Next.js hosting, server actions | One Cloudflare Worker (`.open-next/worker.js`) + Static Assets |
| Turso (`@libsql/client`, `TURSO_DB_URL`/`TOKEN`) | D1 `DB` binding; the id and name are rendered into `wrangler.jsonc` per environment from the Terraform root's wiring document |
| The table created on first render | `packages/db/src/migrations/010_todos`, applied by `infra/db-migrate` before the Worker deploys |
| `file:./dev.db` locally | wrangler's local D1 (`pnpm --filter @app/web db:migrate:local` creates the table) |
| A database created with the Turso CLI | `infra/terraform/cloudflare-d1`, applied by Orun before the migrations and the Worker |
| Deploy on push | Orun applies the database, migrates it and deploys `<repo>-web-{stage,prod}` on merge to `main` |
| "Deploy with Vercel" (clone the template) | `orun new --blueprint repo-blueprint.yaml` — a new repository, branded, deployed |

## How the database reaches the Worker

```
infra/terraform/cloudflare-d1 ──apply──► orun secret WIRING_CLOUDFLARE_D1 (stage, prod)
                                               │   (the landing's await checks it exists)
                                               ▼
infra/db-migrate  dependsOn cloudflare-d1 (enforced on main) · secretEnv WIRING_CLOUDFLARE_D1
  apply:  packages/db's runner → POST …/d1/database/<id>/query, each pending migration once
                                               ▼
apps/web  dependsOn cloudflare-d1 + db-migrate (enforced on main) · secretEnv WIRING_CLOUDFLARE_D1_<ENV>
  build:  tooling/wire/live.mjs → wrangler.jsonc with the environment's database id
          (dev, verify-only, renders the fixture) → next build → opennextjs-cloudflare
```

`wrangler.jsonc` is committed as the fixture render of
`wrangler.template.jsonc`, because the deploy lane's `verify-app-structure`
step checks the config exists before it builds; `testing/e2e.test.sh` fails
if the two disagree.

## CI

| Workflow | What it runs | Ships to a product |
|---|---|---|
| `ci.yml` | the Orun pipeline, and the only workflow a product carries: `orun plan --changed`, then one job per lane. A pull request runs the verify lanes (packages type-checked, linted, tested and built, both test suites, the site built and dry-deployed per environment), except the bootstrap's own landings (`orun/BASE-*`), where `plan` alone is the check; a merge applies the D1 database, migrates it, then deploys stage → prod. It plans nothing while `intent.yaml` names the placeholder workspace `ws_CHANGE_ME`, as this repository does. A manual run (Orunbase's Deploy button, or Run workflow on `main`) plans the environment and components it names under the push-to-main trigger, so they deploy as a merge deploys them | yes |
| `baseline.yml` | the baseline's own tiers: contract tests, the wiring path, the blueprint read by the pinned orun, the leak gate, the offline bootstrap with the product's own plan, the product built in the job tree, migrated, dry-deployed and served | no |
| `tag.yml` | cuts a `baseline-vN` tag (manual) | no |
