# apps/web — the site

A todo list, from Vercel's Next.js + Turso starter (in
[next.js/examples](https://github.com/vercel/next.js/tree/canary/examples),
MIT), running on Cloudflare Workers + Static Assets with the todos in
Cloudflare D1 instead of Turso:

- One page: the list (a server component reading the `DB` binding) and a form
- Adding and removing a todo are server actions (`app/actions.ts`)
- `lib/turso.ts` keeps the libSQL client's `execute()` shape over D1, so the
  SQL is the upstream template's, unchanged
- The `todos` table is a migration in `packages/db`, applied before every
  deploy by the `db-migrate` component — not created by the page, as
  upstream did on first use

The site's name and the repository it links to are in `lib/site.ts`.

```bash
pnpm run wire:fixture      # wrangler.jsonc from the template, placeholder database ids
pnpm db:migrate:local      # the migrations, applied to wrangler's local D1
pnpm dev                   # next dev on http://localhost:3000, the local D1 through wrangler
pnpm build                 # next build + opennextjs-cloudflare build → .open-next/
pnpm preview               # wrangler dev over the built Worker, the same local D1
```

Until the migrations have run, the page says the table is missing rather
than failing. How it is deployed — the database from
`infra/terraform/cloudflare-d1`, its schema from `infra/db-migrate`, its id
rendered into `wrangler.jsonc` per environment, on merge to `main` — is the
repository's README and `component.yaml` beside this file.
