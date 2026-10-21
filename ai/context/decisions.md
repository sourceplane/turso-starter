# turso-starter — decisions

The choices that shape this repository, one line each, with where the full
reasoning lives. Superseded decisions stay listed, marked, so the history
reads in order.

| # | Decision | Why | Source |
|---|---|---|---|
| 1 | `lib/turso.ts` keeps the libSQL client's `execute()` shape over the `DB` D1 binding; the template's SQL runs as written | D1 is SQLite, and so are the template's statements: one file changes | `specs/epics/turso-starter/README.md`, design.md |
| 2 | ~~The table is created on first use, as upstream does~~ — superseded by #3 in TU5 | — | risk TU-A |
| 3 | The schema is a migration (`packages/db`'s `010_todos`), applied by `infra/db-migrate` between the D1 apply and the Worker's deploy; the page never writes DDL | The template said to remove create-on-first-use in production; the convergence's order then includes the schema | risk TU-A, design.md §6 |
| 4 | `app/page.tsx` is `force-dynamic` | The Worker serves pre-rendered pages from a read-only cache, so ISR would never show a new todo | risk TU-D |
| 5 | `wrangler.jsonc` is rendered from the D1 root's wiring document per environment, and the fixture render is committed; dev renders the fixture | The deploy lane checks the config exists before the build; no root applies in dev | risks TU-G, TU-H |
| 6 | One landing (`01-product`) then the record (`02-docs`), replacing TU4's four phases; edges `mode: enforced` on main, advisory on a pull request | The plan, not a landing boundary, orders the database, its schema and the Worker (cirrus-baseline since baseline-v22) | design.md §6 |
| 7 | The D1 apply and the migrations use their own `d1-edit` key (`CLOUDFLARE_D1_TOKEN`) | The `workers-deploy` token cannot touch D1 | design.md §6, risk TU-F |
| 8 | The migrations package is named `@saas/db` | stack-tectonic's db-migrate composition builds `--filter=@saas/db` | risk TU-J |
| 9 | The smoke requires `data-todos="N"` on `/` | Only a Worker that read the migrated table renders it; read-only, so no deploy writes a todo | IMPLEMENTATION-STATUS (TU5) |
| 10 | stack-tectonic 0.19.0, not 0.20.0 | 0.20.0 links the install out of the job's tree, which Next 16's Turbopack refuses | `intent.yaml` (the pin's comment) |
| 11 | orun is pinned only where it runs (the `orun-action` `version:` in each workflow); no kiox | `kiox.yaml` pinned a version (v2.15.0) nothing ran | IMPLEMENTATION-STATUS (TU6) |
| 12 | Component docs are generated from the manifests and checked in CI | A hand-written copy of the dependency graph, bindings and migrations drifts silently | `tooling/catalog/gen-component-docs.py` |
| 13 | The console card reads `subdomain` from the Cloudflare connection (`from: connection.cloudflare.workersSubdomain`); only a hand-run build passes it | It belongs to the account like its id and has one right answer; a typed one could only be wrong, and wrong showed up after deploy (cirrus-baseline since baseline-v23) | `blueprint.yaml`, IMPLEMENTATION-STATUS (TU-8) |
