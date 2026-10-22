# turso-starter — operating contract (for humans and agents)

This is the standing guide to how this site is deployed and operated.
Instance facts (live URLs, workspace, secrets inventory) live in
[deployment.md](deployment.md), rendered from probed reality by the
bootstrap's `02-docs` phase; this file is the contract that stays true
between deployments. It is written to give an agent with repository read
access enough context to reason about and operate the site without any
other source.

## What this system is

A todo list on Cloudflare alone, expressed as an Orun component-native
desired-state repo.

- **`infra/terraform/cloudflare-d1`** — one Cloudflare D1 database per
  deployed environment (`stage`, `prod`), applied by Terraform. After each
  apply it publishes a wiring document — `{d1_database_id, d1_database_name}`
  — as the Orun secret `WIRING_CLOUDFLARE_D1` on that environment.
- **`packages/db`** — the schema as migrations (`src/migrations/*/up.sql`,
  listed with their checksums in `src/manifest.ts`) and the runner that
  applies them to D1 over the REST API, recording each in a
  `_migrations_applied` table.
- **`infra/db-migrate`** — runs that runner per environment: it plans offline
  on a pull request and applies on a merge, finding the database through
  `WIRING_CLOUDFLARE_D1`.
- **`apps/web`** — the site: Next.js built by `@opennextjs/cloudflare` into
  one Worker plus Static Assets. The page renders per request and lists the
  `todos` table through the `DB` D1 binding; adding and removing a todo are
  server actions (`app/actions.ts`). `lib/turso.ts` is the libSQL client's
  `execute()` shape over D1.
- **`tests/web`**, **`tests/db`** — the list and the actions against an
  in-memory D1, and the migrations applied through the runner into real
  SQLite (vitest), verified on the `dev` rung.
- **`tooling/*`** — shared TypeScript and ESLint configuration, the wrangler
  renderer that turns `wrangler.template.jsonc` plus a wiring document into
  `wrangler.jsonc`, and the migration helpers (the manifest's checksum
  check, the local-D1 apply).

Environments: **`stage`** and **`prod`** are deployed; **`dev` is
verify-only by design** — lanes build and test, nothing deploys, and no D1
database exists for it (its build renders the committed fixture).

## Identity and tenancy

Every remote operation runs against ONE Orun workspace, declared in
`intent.yaml` under `execution.state.workspace` — committed, enforced, and
what CI uses. Do not remove it; headless credentials depend on it. If it
reads `ws_SET_ME`, the bootstrap had no workspace to write: set the real one
before anything else.

## How deployment works

1. Merge (or push) to `main`.
2. CI (`.github/workflows/ci.yml`) runs `orun plan --changed` — only
   components whose files changed are planned — then runs each planned lane
   with `orun run --remote-state`, authenticated by GitHub OIDC (the
   exchange resolves this repository's linked workspace server-side).
3. **The database, then its schema, then the Worker**, per environment.
   `cloudflare-d1` applies and publishes `WIRING_CLOUDFLARE_D1`.
   `db-migrate` declares an enforced `dependsOn` on it for pushes to `main`,
   so it starts after that apply — a job resolves its secrets when it
   starts, so the document is there — and applies every pending migration.
   `apps/web` waits on both the same way.
4. `apps/web` renders `wrangler.jsonc` from that document (the real
   database id), builds once per environment, `wrangler deploy` ships
   `turso-starter-web-<env>`, and a smoke test fetches `/` and requires the
   list's row count (`data-todos="N"`) — which only a Worker that queried
   the migrated `todos` table renders.
5. `prod` deploys after `stage` has converged on the same commit
   (`environments.prod.promotion` in intent.yaml).
6. **The convergence run is the deployment.** A green run means every
   planned lane applied. Failed lanes are retried with
   `gh run rerun --failed`, which resumes the same execution.

On a pull request nothing applies or deploys: the D1 root plans, the
migrations plan offline (their checksums verified), the site builds and
dry-deploys, and the edges in step 3 are advisory.

Caveats that matter:

- A push that touches no component files plans zero lanes — that run is
  green and deployed nothing. Never treat "latest run green" as "site
  converged"; probe the URLs instead.
- A change to `intent.yaml`'s `environments` maps to no component and
  redeploys nothing on its own. Land it with a change under `apps/web`.
- `wrangler.jsonc` is generated. Edit `wrangler.template.jsonc` and run
  `pnpm run wire:fixture`; Checks fails when the two disagree.
- An applied migration is immutable: its checksum is recorded, and the
  runner refuses to run while a file no longer matches it. Change the
  schema with a NEW migration.

## Secrets model

- **Brokered provider secrets**, minted per run from the workspace's
  Cloudflare connection — no long-lived values at rest, nothing to rotate by
  hand:
  - `CLOUDFLARE_API_TOKEN` (`workers-deploy`: Workers Scripts) — the site's
    deploy;
  - `CLOUDFLARE_D1_TOKEN` (`d1-edit`: D1) — the D1 root's apply and the
    migration runner, which bind it as their `CLOUDFLARE_API_TOKEN`; the
    deploy token cannot touch D1;
  - `CLOUDFLARE_ACCOUNT_ID` — a connection fact all three bind.
- **Wiring**: `WIRING_CLOUDFLARE_D1` on `stage` and `prod`, written by the
  D1 root's apply (lease-published), read by the migration runner and by the
  Worker's build as `WIRING_CLOUDFLARE_D1_<ENV>`. It holds ids, not
  credentials.
- Inspect by NAME only: `orun secrets list --org <ws> --project` and
  `--env stage|prod`. No tooling in this repository prints a secret value,
  and no document in `ai/context/` may contain one.
- The site needs no runtime secret: the binding is the credential.

## Verifying the system

```bash
# the site on each environment (also recorded, probed, in deployment.md);
# the list's row count is in the HTML
curl -s https://turso-starter-web-stage.your-workers-subdomain.workers.dev/ | grep -Eo 'data-todos="[0-9]+"'
curl -s -o /dev/null -w '%{http_code}\n' https://turso-starter-web-prod.your-workers-subdomain.workers.dev/

# the wiring the migrations and deploys read, and workspace readiness
orun secrets list --org <ws> --env stage && orun secrets list --org <ws> --env prod
orun integrations list --org <ws> --json && orun cloud check --org <ws>
```

## Common operations

| task | how |
|---|---|
| change the site | edit `apps/web/app/` (its name and source link: `apps/web/lib/site.ts`), merge |
| change the schema | add `packages/db/src/migrations/<NNN>_<name>/up.sql` (idempotent: `IF NOT EXISTS`), list it in `src/manifest.ts`, `pnpm --filter @saas/db run manifest:fix`, merge — db-migrate applies it before the site redeploys |
| try the schema locally | `pnpm --filter @app/web db:migrate:local` applies every migration to wrangler's local D1 |
| deploy a change | merge to `main`; watch the run; failed lanes → `gh run rerun --failed` |
| redeploy without a change | edit the last line of `apps/web/component.yaml` (`# orun: redeploy <reason> <stamp>`) and merge — it is a deploy trigger, nothing reads it |
| query a live database | `wrangler d1 execute <name> --remote --command "SELECT count(*) FROM todos"` (the name is in the environment's `WIRING_CLOUDFLARE_D1`) |
| add a binding (R2, KV, another D1) | a Terraform root under `infra/terraform/` that publishes `WIRING_<ROOT>`, a token in `wrangler.template.jsonc`, its fixture entry, the root in the build's `--components`, the `WIRING_<ROOT>_<ENV>` secretEnv and an enforced `dependsOn` on it in `apps/web/component.yaml` |
| serve a custom domain | attach it to the Worker in Cloudflare (README, "Custom domain"), then replace the placeholder `turso-starter.example.com` in `intent.yaml`'s `BASE_DOMAIN` with it |
| add a runtime secret | `orun secrets set <KEY> --org <ws> --env <env>` |
| headless credentials | `ORUN_TOKEN` (workspace-scoped) + `GITHUB_TOKEN` |

The deployment record is the bootstrap's `02-docs` phase. Re-running it (the
Orun console's Retry on that phase, or `orun new … --phase 02-docs`)
re-probes the URLs and re-renders [deployment.md](deployment.md); it is
idempotent.

## Evolution

D1 has no interactive transactions and caps a database's size; the todo list
needs neither. Structural changes follow the same contract that deployed the
site: add a component under `apps/`, `infra/` or `packages/` with a
`component.yaml`, land it as a pull request, and the convergence run applies
it.
