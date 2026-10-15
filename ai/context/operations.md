# turso-starter — operating contract (for humans and agents)

This is the standing guide to how this site is deployed and operated.
Instance facts (live URLs, workspace, secrets inventory) live in
[deployment.md](deployment.md), rendered from probed reality by the
bootstrap's `04-docs` phase; this file is the contract that stays true
between deployments. It is written to give an agent with repository read
access enough context to reason about and operate the site without any
other source.

## What this system is

A todo list on Cloudflare alone — Workers and D1 — expressed as an Orun
component-native desired-state repo.

- **`apps/web`** — the site: Next.js built by `@opennextjs/cloudflare` into
  one Worker plus Static Assets. The page renders on every request from
  the `DB` binding; adding and removing a todo are server actions in the
  Worker. The list creates its `todos` table on first use.
- **`infra/terraform/cloudflare-d1`** — one D1 database per environment.
  After apply, its id and name are published as the `WIRING_CLOUDFLARE_D1`
  secret; the site's build renders them into `wrangler.jsonc`
  (`tooling/wire/live.mjs`), so no database id is committed.
- **`tests/web`** — the database client and site-identity tests (vitest),
  verified on the `dev` rung.
- **`tooling/*`** — shared TypeScript and ESLint configuration, and the
  deploy-time wrangler renderer for workers that take wiring.

Environments: **`stage`** and **`prod`** are deployed; **`dev` is
verify-only by design** — lanes build and test, nothing deploys.

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
3. A change under `infra/terraform/cloudflare-d1` plans and applies the
   database per environment, authenticated with the brokered `d1-edit`
   token (the deploy token cannot touch D1).
4. `apps/web` builds once per environment, after rendering that
   environment's database id and name from `WIRING_CLOUDFLARE_D1`, then
   `wrangler deploy` ships `turso-starter-web-<env>` and a smoke test
   fetches `/` from it.
5. `prod` deploys after `stage` has converged on the same commit
   (`environments.prod.promotion` in intent.yaml).
6. **The convergence run is the deployment.** A green run means every
   planned lane applied. Failed lanes are retried with
   `gh run rerun --failed`, which resumes the same execution.

Caveats that matter:

- A push that touches no component files plans zero lanes — that run is
  green and deployed nothing. Never treat "latest run green" as "site
  converged"; probe the URLs instead.
- A change to `intent.yaml`'s `environments` maps to no component and
  redeploys nothing on its own. Land it with a change under `apps/web`.
- Destroying or recreating the database loses every todo: D1 is the only
  copy. Terraform's `adopt.tf` imports an existing database rather than
  creating a second one.

## Secrets model

- **Brokered provider secrets**: `CLOUDFLARE_API_TOKEN` (Workers deploy
  scope) and `CLOUDFLARE_ACCOUNT_ID` — pointers minted per run from the
  workspace's Cloudflare connection. No long-lived values at rest; nothing
  to rotate by hand.
- Inspect by NAME only: `orun secrets list --org <ws> --project` and
  `--env stage|prod`. No tooling in this repository prints a secret value,
  and no document in `ai/context/` may contain one.
- The site needs no runtime secret: the database is a binding, not a
  connection string.

## Verifying the system

```bash
# the site on each environment (also recorded, probed, in deployment.md)
curl -s -o /dev/null -w '%{http_code}\n' https://turso-starter-web-stage.your-workers-subdomain.workers.dev/
curl -s https://turso-starter-web-prod.your-workers-subdomain.workers.dev/ | grep -c 'Insert new todo'

# the database on each environment
wrangler d1 execute <db-name> --remote --command 'SELECT count(*) FROM todos'

# workspace readiness (integrations + repository link)
orun integrations list --org <ws> --json && orun cloud check --org <ws>
```

## Common operations

| task | how |
|---|---|
| change the schema | the list creates `todos` on first use; for anything beyond that, add a migration step before the site's deploy (none ships) |
| deploy a change | merge to `main`; watch the run; failed lanes → `gh run rerun --failed` |
| redeploy without a change | edit the last line of `apps/web/component.yaml` (`# orun: redeploy <reason> <stamp>`) and merge — it is a deploy trigger, nothing reads it |
| serve a custom domain | attach it to the Worker in Cloudflare (README, "Custom domain") — nothing in the repository changes |
| add a runtime secret | `orun secrets set <KEY> --org <ws> --env <env>` |
| headless credentials | `ORUN_TOKEN` (workspace-scoped) + `GITHUB_TOKEN` |

The deployment record is the bootstrap's `04-docs` phase. Re-running it (the
Orun console's Retry on that phase, or `orun new … --phase 04-docs`)
re-probes the URLs and re-renders [deployment.md](deployment.md); it is
idempotent.

## Evolution

Structural changes (a second Worker, an API, a data store) follow the same
contract that deployed the site: add a component under `apps/`, `infra/` or
`packages/` with a `component.yaml`, land it as a pull request, and the
convergence run applies it.
