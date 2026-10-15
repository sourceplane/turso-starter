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
  wrangler.template.jsonc     worker name, nodejs_compat, ASSETS, the DB binding as wiring tokens
  cloudflare-env.d.ts         the bindings' types
infra/terraform/cloudflare-d1 the database per environment (Cirrus's root)
tests/web                     vitest: the client, the list's first-run create, the actions
```

## 5. Out of scope

Migrations (Cirrus's `packages/db` + `db-migrate` when a product outgrows
"create on first use"), auth, and a custom domain.

## 6. The baseline (TU4)

The repository instantiates new todo lists the way
[portfolio-starter-kit](https://github.com/sourceplane/portfolio-starter-kit)
instantiates sites — a console card (`blueprint.yaml`), a build document
(`repo-blueprint.yaml`) `orun new` runs, and a rename engine that makes the
copy somebody else's. The two repositories share every file outside the app
and the database, so the machinery is portfolio-starter-kit's PK3 plus what
its first live bootstrap found (PK-5) — stack-tectonic 0.19.0, `checks.yml`
on pull requests only — with the names changed. What is this repository's
own is the database, and it takes a phase:

| Phase | Lands | From |
|---|---|---|
| `01-scaffold` | the repository, CI, tooling (incl. `tooling/wire`), identity | portfolio-starter-kit, unchanged |
| `02-data` | `infra/terraform/cloudflare-d1`; mints `CLOUDFLARE_D1_TOKEN` (`d1-edit`) and `CLOUDFLARE_ACCOUNT_ID`; verifies `WIRING_CLOUDFLARE_D1` on stage and prod | virga's `03-infrastructure`, without KV |
| `03-site` | `apps/web` + `tests/web`; mints `CLOUDFLARE_API_TOKEN` (`workers-deploy`) | portfolio-starter-kit's `02-site`, now requiring `02-data` |
| `04-docs` | the deployment record, the promotion gate and dev lanes put back | portfolio-starter-kit's `03-docs` |

**Why a phase of its own, before the site.** `apps/web/component.yaml`
dependsOn `cloudflare-d1`, and its build renders the database's id from
`WIRING_CLOUDFLARE_D1_<ENV>` (`tooling/wire/live.mjs` fails loudly when it
is missing). Landing both in one phase would deploy the site in the same
convergence that first creates the database; landing the database first
makes `03-site`'s precondition a fact `02-data` verified
(`orun.secrets/exists@v1`), and gives a failed apply — most often a token
without D1 Write — a phase, a message and a re-run of its own.

**Departures from portfolio-starter-kit, and why:**

| portfolio-starter-kit | Here | Why |
|---|---|---|
| `intent.yaml` drops the Terraform `parameterDefaults` | kept | the D1 root reads them; the component also names `repo` (as virga's does) |
| `NEXT_PUBLIC_SITE_URL`, `SITE_URL` per environment | none | the page builds no absolute link; a custom domain needs no change in the repository |
| `apps/web/app/site.ts`: `SITE_NAME`, `SOURCE_URL`, `escapeXml` | `apps/web/lib/site.ts`: `SITE_NAME`, `SOURCE_URL` | the page's heading and title; a "source" link under the heading (upstream had none) |
| smoke: the nav's `/blog` link, `/rss` is a feed | smoke: the page renders the todo form | it only renders after reading D1 |
| e2e reads `/blog`, `/rss`, `/sitemap.xml`, `/og` | e2e adds, lists and removes a todo through the page's own server actions (`testing/lib/server-action.mjs`, React's own reply encoder) against wrangler dev's local D1 | the site's one promise is that the store works |
| product name `My Portfolio`, epic `portfolio-baselining` | `My Todos`, `todos-baselining` | |
| upstream's `apps/web/README.md` | rewritten | upstream's tells the reader to create a Turso database and set `TURSO_DB_URL`, which this site does not use |

`tooling/migrations` stays in this repository and does not ship: nothing
references it (the list creates its table on first use, risks TU-A).
