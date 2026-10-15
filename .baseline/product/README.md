# turso-starter

A todo list — server actions over a SQLite database — on **Cloudflare
Workers + Static Assets** with **Cloudflare D1**, through [`@opennextjs/cloudflare`](https://opennext.js.org/cloudflare).

## Live deployment

<!-- 04-docs:begin -->
Not recorded yet. The bootstrap's last phase writes the live URLs, the
workspace and the secrets inventory into
[ai/context/deployment.md](ai/context/deployment.md); how the site deploys
and how to operate it is in
[ai/context/operations.md](ai/context/operations.md).
<!-- 04-docs:end -->

## What is here

| Surface | Where |
|---|---|
| The site's name and source link | `apps/web/lib/site.ts` |
| The page, the list, the form, the server actions | `apps/web/app` |
| The database client (`execute()` over the D1 binding) | `apps/web/lib/turso.ts` |
| The database, one per environment (Terraform) | `infra/terraform/cloudflare-d1` |
| Workers build and deploy contract | `apps/web/next.config.mjs`, `open-next.config.ts`, `wrangler.jsonc`, `component.yaml` |
| Tests | `tests/web` (vitest) |

## Getting started

```bash
pnpm install
pnpm typecheck
pnpm lint
pnpm test
pnpm build            # next build + opennextjs-cloudflare build → apps/web/.open-next
```

```bash
pnpm --filter @app/web dev        # http://localhost:3000
pnpm --filter @app/web preview    # wrangler dev over the built Worker
```

`pnpm run wire:fixture` renders `apps/web/wrangler.jsonc` from the template
with placeholder database ids; locally, wrangler gives the `DB` binding a
SQLite file of its own, and the list creates its `todos` table on first use.
Make the site yours in `apps/web/app/page.tsx` (the page) and
`apps/web/lib/site.ts` (its name and the repository it links to).

There is nothing to configure: the database is the `DB` binding, and no id
is committed — the deploy renders it from the database's wiring document.

## How it deploys

Merges to `main` converge through [Orun](https://opencode.ai/docs):
`.github/workflows/ci.yml` plans the changed components and runs each lane
against the workspace in `intent.yaml`. `infra/terraform/cloudflare-d1`
applies one D1 database per environment and publishes its id as the
`WIRING_CLOUDFLARE_D1` secret; the site's build renders that into
`wrangler.jsonc`, so the database id is never committed. The site deploys to `stage`, then to
`prod` once stage has converged on the same commit; `dev` only verifies. The
Worker is `turso-starter-web-<env>` on your account's workers.dev
subdomain, and every deploy is smoke-tested over HTTP. `checks.yml` runs
install, typecheck, lint, test and build on every pull request. (A push to
`main` runs `ci.yml` alone, which builds, tests and deploys.)

The pipeline holds one credential, GitHub's own `GITHUB_TOKEN`. The
Cloudflare tokens — one to deploy Workers, one (`d1-edit`) for Terraform to
manage the database — and the account id are brokered per run from the workspace's
Cloudflare connection; nothing provider-shaped is stored in the repository
or in GitHub.

## Custom domain

The site answers on workers.dev from its first deploy. To serve it on your
own domain:

1. Add the domain to the Cloudflare account the site deploys into, and attach
   it to the Worker (dashboard → Workers & Pages →
   `turso-starter-web-prod` → Settings → Domains & Routes → Add →
   Custom domain). Do the same for stage with a subdomain if you want one.
2. Nothing changes in the repository: the todo list builds no absolute
   links, so the domain only has to answer.
