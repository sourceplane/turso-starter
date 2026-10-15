# turso-starter

Vercel's [Next.js + Turso starter](https://github.com/vercel/next.js/tree/canary/examples/with-turso)
— a todo list whose server actions insert and delete rows in SQLite —
running on **Cloudflare Workers + Static Assets** through
[`@opennextjs/cloudflare`](https://opennext.js.org/cloudflare), with the
todos in a **Cloudflare D1** database provisioned by Terraform through
[Orun](https://github.com/sourceplane/orun) — and packaged as an **Orun
baseline**: one command takes a new todo list from nothing to live on stage
and prod, its own database included, in its own repository, under its own
name.

Turso and D1 are both SQLite, so the SQL does not change; `lib/turso.ts`
keeps the libSQL client's `execute()` shape over the D1 binding. The
baseline is built the way
[portfolio-starter-kit](https://github.com/sourceplane/portfolio-starter-kit)
is, with a data phase from [virga](https://github.com/sourceplane/virga). See
[`specs/epics/turso-starter`](specs/epics/turso-starter/README.md) for the
design, the milestones and the as-built status.

## Instantiating a site

```bash
git clone --depth 1 --branch <baseline-tag> https://github.com/sourceplane/turso-starter
cd turso-starter
orun new --blueprint repo-blueprint.yaml --out ~/sites/acme-todos --run-hooks --resume \
  --set reponame=acme-todos --set productname="Acme Todos" --set productdomain=acme.dev \
  --set githuborg=acme-inc --set subdomain=<workers-dev-subdomain>
```

Or, once the platform's registry lists it, from the Orun console (Baselines →
`turso-starter` → Build). Four phases — `01-scaffold` (the repository, its CI
and identity), `02-data` (a D1 database per environment, applied by
Terraform, its id published as a wiring secret), `03-site` (the site deployed
to stage and prod, smoke-tested), `04-docs` (the live deployment recorded) —
each landing one pull request in the new repository.
**[BOOTSTRAP.md](BOOTSTRAP.md)** is the operator guide;
[docs/phases/](docs/phases/README.md) has a page per phase. The Cloudflare
connection's token needs **D1 Write** as well as Workers Scripts Write.

The new repository receives the **site only** — the app, its database's
Terraform root, its tests, its CI, its tooling, a README of its own and its
operating contract — renamed throughout to the site's name, repository,
database and Cloudflare Worker. None of this repository's machinery ships.

| What makes it a baseline | Where |
|---|---|
| The console card (inputs, secrets, programme) | `blueprint.yaml` |
| The build document (modules, phases, hooks) | `repo-blueprint.yaml` |
| This tree's identity, and the bootstrap's task contracts | `.baseline/` |
| The rename engine | `tooling/rebrand/rebrand.mjs` |
| The bootstrap's helpers (deferrals, redeploy marker, work-tree strip) | `tooling/bootstrap/` |
| The deployment-record renderer | `hooks/render-deployment-docs.sh` |
| The site's README and context pack | `.baseline/product/README.md`, `ai/context/` |
| The baseline's tests: contract, leak, offline bootstrap, end to end | `testing/`, `.github/workflows/baseline.yml` |
| Cutting a `baseline-vN` tag | `.github/workflows/tag.yml` |

## What is here (the site)

| Surface | Where |
|---|---|
| The site's name and source link | `apps/web/lib/site.ts` |
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
| Deploy on push | Orun applies the D1 root, then deploys `<repo>-web-{stage,prod}` on merge to `main` (`apps/web/component.yaml`) |
| "Deploy with Vercel" (clone the template, create a Turso database) | `orun new --blueprint repo-blueprint.yaml` — a new repository, branded, its database created, deployed |

## CI

| Workflow | What it runs | Ships to a site |
|---|---|---|
| `checks.yml` | install, wire fixtures, typecheck, lint, test, build — every PR (not pushes: on main, `ci.yml` must be the only run a commit has, because the bootstrap's convergence watch takes the newest one) | yes |
| `ci.yml` | the Orun pipeline: `orun plan --changed`, then one job per lane; applies the database and deploys stage → prod on merge. It plans nothing while `intent.yaml` names the placeholder workspace `ws_CHANGE_ME`, as this repository does | yes |
| `baseline.yml` | the baseline's own tiers: contract tests, the blueprint read by the pinned orun, the leak gate, the offline bootstrap, the site built, dry-deployed, served and a todo round-tripped through a local D1 | no |
| `tag.yml` | cuts a `baseline-vN` tag (manual) | no |
