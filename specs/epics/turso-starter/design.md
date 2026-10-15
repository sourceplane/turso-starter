# turso-starter — design

## 1. What the template is

A todo list on the App Router: `TodoList` (server component) checks
`sqlite_master` for a `todos` table, creates it if missing, and selects
every row; `Form` calls the `addTodo` server action (`INSERT … VALUES (?)`),
each `Todo` calls `removeTodo` (`DELETE … WHERE id = ?`); both
`revalidatePath('/')`. `lib/turso.ts` creates the libSQL client from
`TURSO_DB_URL`/`TURSO_DB_TOKEN`, falling back to a local `file:./dev.db`.

## 2. The mapping (Vercel → Cloudflare)

| Vercel-side primitive the template uses | Here |
|---|---|
| Next.js hosting (dynamic page, server actions) | Cloudflare Workers + Static Assets; the Worker is `@opennextjs/cloudflare`'s output; server actions run in it |
| Turso (libSQL over HTTP, `@libsql/client`) | Cloudflare D1 bound as `DB`; `lib/turso.ts` keeps `execute(string | { sql, args })` and maps it to `prepare().bind().all()`; `rows` and `rowsAffected` come from D1's `results`/`meta.changes` |
| `TURSO_DB_URL` / `TURSO_DB_TOKEN` | No env vars: the database's id and name are rendered into `wrangler.jsonc` from the `cloudflare-d1` root's wiring document |
| `file:./dev.db` for local work | `wrangler dev` / `next dev` (through `initOpenNextCloudflareForDev()`) provide a local SQLite behind the same binding |
| A Turso database created with its CLI | `infra/terraform/cloudflare-d1`: one database per environment, id and name published as the `WIRING_CLOUDFLARE_D1` secret |
| The table created on the first render (`findOrCreateTodosTable`) | since TU5: `packages/db/src/migrations/010_todos` (the same statement, `IF NOT EXISTS`), applied by `infra/db-migrate` over the D1 REST API between the apply and the deploy |
| Deploy on push | Orun: `apps/web/component.yaml` renders the config for `$ORUN_ENVIRONMENT`, builds, and deploys `turso-starter-web-{stage,prod}` on merge to `main` once the product is linked |

D1 versus Turso for this template: both are SQLite; `AUTOINCREMENT`,
`sqlite_master`, `?` parameters behave the same. D1 has no interactive
transactions (Cirrus's README says why), which the template does not use.

Alternative rejected: keeping `@libsql/client` and pointing it at a Turso
database from the Worker. It works (it is HTTPS) but keeps a second
provider and a token for a template whose point is "SQLite next to the
app"; D1 is that on Cloudflare, and the coverage analysis maps Turso to D1.

## 3. The wiring flow

Same as kv-redis-starter with the D1 root: `wrangler.template.jsonc`
carries `@@wiring(cloudflare-d1/__ENV__:d1_database_id)@@` and
`…:d1_database_name)@@`; the verify lane and `pnpm run wire:fixture` render
from `wiring.fixture.json`, the deploy lane from `WIRING_CLOUDFLARE_D1_<ENV>`.

## 4. The repository

```
apps/web                      the template (app/, lib/) + the Workers build
  lib/turso.ts                the execute() shape over the DB binding (the one changed file)
  lib/site.ts                 the site's name and source link (TU4: the rename seam)
  wrangler.template.jsonc     worker name, nodejs_compat, ASSETS, the DB binding as wiring tokens
  wrangler.jsonc              the fixture render, committed (TU5)
  cloudflare-env.d.ts         the bindings' types
infra/terraform/cloudflare-d1 the database per environment (Cirrus's root)
packages/db (@saas/db)        the schema as migrations + Cirrus's D1 REST runner (TU5)
infra/db-migrate              runs it: plans on a pull request, applies on a merge (TU5)
tooling/migrations            the manifest's checksum check, the local-D1 apply
tests/web                     vitest: the client, the list, the actions
tests/db                      vitest: the migrations through the runner, into real SQLite (TU5)
```

## 5. Out of scope

Auth, and a custom domain. (Migrations were out of scope until TU5 made the
schema part of the one convergence.)

## 6. The baseline (TU5 — in one landing)

TU4 made the repository a baseline the portfolio-starter-kit way, in four
phases (`01-scaffold`, `02-data`, `03-site`, `04-docs`): the database had a
phase of its own so that `03-site`'s precondition — the wiring document — was
a fact `02-data` had verified. TU5 rebuilds it the way
[cirrus-baseline](https://github.com/sourceplane/cirrus-baseline) builds a
product since `baseline-v22`, and the D1 order is carried by the plan
instead. The machinery is `kv-redis-starter`'s (KR4), with the names
changed; what is this repository's own is the database and, now, its schema.

| | TU4 | here (TU5) |
|---|---|---|
| phases | `01-scaffold`, `02-data`, `03-site`, `04-docs` | `01-product` (everything, one PR), `02-docs` (hook-only) |
| the order a landing used to hold | the database before the site | the database, then its schema, then the Worker |
| how the plan holds it | — | `infra/db-migrate` `dependsOn: cloudflare-d1`; `apps/web` `dependsOn` both; `mode: enforced`, `modeRules` advisory on `github-pull-request` |
| the schema | created on first render | `packages/db` migrations, applied by `db-migrate` |
| brokered secrets | `CLOUDFLARE_D1_TOKEN` + account id in `02-data`, `CLOUDFLARE_API_TOKEN` in `03-site` | all three in `01-product`, before the landing |
| the landing's await | per phase | watch, `WIRING_CLOUDFLARE_D1` exists on stage and prod, probe |

**One landing.** `01-product` places every module, brands the tree, and
lands it as one pull request whose checks it waits for (Checks: install, the
fixture render, typecheck, lint, test, build). The convergence after the
merge plans, per environment, `cloudflare-d1` (apply, level 0), `db-migrate`
(apply, level 1) and `web` (deploy, level 2): a job resolves its secrets
when it starts, so the migrations find `WIRING_CLOUDFLARE_D1` and the build
finds `WIRING_CLOUDFLARE_D1_<ENV>`. Stage and prod run side by side (the
promotion gate is deferred until `02-docs`), and dev's push lanes are
deferred too. The landing then waits on the convergence
(`orun.run/watch@v1`), asks the platform that the wiring exists on both
environments (`orun.secrets/exists@v1`), and probes both URLs. `02-docs`
places nothing: it restores the two deferrals, renders the deployment record
and lands it.

**The schema.** stack-tectonic's `db-migrate` composition builds a package
named `@saas/db` and runs its `dist/runner/cli.js plan|apply` from the
component's path (`packages/db/src/migrations`) — hence the package's name,
which is the composition's contract, not this repository's scope. The
runner is Cirrus's: a manifest of migrations with their checksums, a
`_migrations_applied` ledger and a lock row in the database itself, and each
statement sent to `POST /accounts/{account}/d1/database/{id}/query` with the
D1 token (`d1-edit`; the deploy token cannot touch D1). On a pull request it
plans offline — every checksum verified, nothing sent. `CLOUDFLARE_API_BASE_URL`
(wrangler's own override) points it at another endpoint, which is how the
e2e tier runs the lane's real apply step offline. Locally,
`pnpm --filter @app/web db:migrate:local` applies the same files to
wrangler's local D1 with `wrangler d1 execute --local`.

**The smoke** reads `/` and requires `data-todos="N"`, which the list renders
only after selecting from the migrated table: the binding, the schema and the
Worker, proven by one read, with nothing written to prod.

**Identity in the app** stays TU4's `apps/web/lib/site.ts` (`SITE_NAME`,
`SOURCE_URL`); the slug also names the D1 databases (`stg-<slug>-stage`)
through terraform's `repo` and the migration runner's `repo` parameter. No
`SITE_URL`: the page renders no absolute link to itself.

**Testing without the platform.** `testing/lib/bootstrap.sh` places both
phases and runs the blueprint's own `run:` hooks; `testing/placement.test.sh`
plans the product's own merge (the three levels) and a pull request (nothing
waits); `testing/wire.test.sh` holds the wiring path together;
`testing/e2e.test.sh` builds the product in the trees orun stages, runs the
migration lane against `testing/lib/d1-api.py` (a stand-in for D1's REST API
over real SQLite), dry-deploys, serves it and runs its smoke.
