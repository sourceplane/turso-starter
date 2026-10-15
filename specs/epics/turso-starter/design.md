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
