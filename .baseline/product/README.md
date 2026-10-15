# turso-starter

A todo list whose server actions insert and delete rows in SQLite — Next.js
on **Cloudflare Workers + Static Assets** through
[`@opennextjs/cloudflare`](https://opennext.js.org/cloudflare), with the
todos in a **Cloudflare D1** database that Terraform provisions per
environment and whose schema is applied by migrations before every deploy.

## Live deployment

<!-- 02-docs:begin -->
Not recorded yet. The bootstrap's last phase writes the live URLs, the
workspace and the secrets inventory into
[ai/context/deployment.md](ai/context/deployment.md); how the site deploys
and how to operate it is in
[ai/context/operations.md](ai/context/operations.md).
<!-- 02-docs:end -->

## What is here

| Surface | Where |
|---|---|
| The page, the form, the list and the server actions | `apps/web/app` |
| The site's name and source link | `apps/web/lib/site.ts` |
| The client (libSQL's `execute` shape over D1) | `apps/web/lib/turso.ts` |
| Workers build, bindings and deploy contract | `apps/web/next.config.mjs`, `open-next.config.ts`, `wrangler.template.jsonc` + `wiring.fixture.json` (→ `wrangler.jsonc`), `component.yaml` |
| The D1 database (stage, prod) | `infra/terraform/cloudflare-d1` |
| The schema (migrations) and their runner | `packages/db`, applied by `infra/db-migrate` |
| Tests | `tests/web`, `tests/db` (vitest) |

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

Make the site yours in `apps/web/app/`, and its name and the repository it
links to in `apps/web/lib/site.ts`.

## How the database is wired

The Worker binds the database as `DB`. Its id is never hand-written:
`apps/web/wrangler.template.jsonc` names it as a wiring token, and
`wrangler.jsonc` is that template rendered — from `wiring.fixture.json`
(placeholder ids) for local work and verification, and on every deploy from
the document the `cloudflare-d1` Terraform root publishes after its apply
(`WIRING_CLOUDFLARE_D1`, per environment). Edit the template, then
`pnpm run wire:fixture`; Checks fails if the committed `wrangler.jsonc` is
not the fixture render.

The schema is `packages/db`'s migrations, not the page's: each
`src/migrations/<NNN>_<name>/up.sql` is listed in `src/manifest.ts` with
its checksum, and the `db-migrate` component applies the pending ones to
each environment's database before the site deploys. To change the schema,
add a migration (never edit an applied one — its checksum is recorded),
then `pnpm --filter @saas/db run manifest:fix`. Locally,
`pnpm --filter @app/web db:migrate:local` applies the same files to
wrangler's local D1; until it has run, the page says so instead of listing.

## How it deploys

Merges to `main` converge through [Orun](https://github.com/sourceplane/orun):
`.github/workflows/ci.yml` plans the changed components and runs each lane
against the workspace in `intent.yaml`. Per environment, the D1 database
applies first, then its migrations, then the site builds with that
environment's database id and deploys — to `stage`, then to `prod` once
stage has converged on the same commit; `dev` only verifies. The Worker is
`turso-starter-web-<env>` on your account's workers.dev subdomain, and
every deploy is smoke-tested over HTTP: the page must render the list's row
count, which only a Worker that queried its database can. `checks.yml` runs
install, the fixture render, typecheck, lint, test and build on every pull
request. (A push to `main` runs `ci.yml` alone, which applies, migrates,
builds and deploys.)

The pipeline holds one credential, GitHub's own `GITHUB_TOKEN`. The
Cloudflare tokens (one to deploy, one scoped to D1) and the account id are
brokered per run from the workspace's Cloudflare connection, and the
database ids travel as Orun secrets; nothing provider-shaped is stored in the
repository or in GitHub.

## Custom domain

The site answers on workers.dev from its first deploy. To serve it on your
own domain, add the domain to the Cloudflare account the site deploys into
and attach it to the Worker (dashboard → Workers & Pages →
`turso-starter-web-prod` → Settings → Domains & Routes → Add → Custom
domain). Nothing in the repository changes: the page renders no absolute
link to itself.
