# Epic: turso-starter (TU)

**Turso is SQLite with a network in front of it; so is D1. Vercel's Turso starter is a todo list whose four SQL statements are plain SQLite, so the port changes one file: `lib/turso.ts` keeps the libSQL client's `execute()` shape — a string or `{ sql, args }` — over the `DB` D1 binding, and the table check, the create, the select, the insert and the delete run as written. The database comes from Terraform through Orun (the Cirrus baseline's own D1 root) and reaches the Worker through the wiring documents every binding in this programme uses.**

The port keeps the page, the form, the server actions and the todo list. It adds the Workers build, the monorepo wrapper, a test package that runs the actions and the list against an in-memory D1, the D1 Terraform root, and the deploy contract.

## Status

| Field | Value |
|-------|-------|
| Status | ✅ TU0–TU6 shipped (#1–#8): TU4 tagged `baseline-v1`, TU5 tagged `baseline-v2`, TU6 (the cirrus standard, TU-7 and TU-8) tagged `baseline-v3`. D1 apply, migrations and live deploy proven only by a live bootstrap (risk TU-E) |
| Cluster | **TU** (TU0–TU6) |
| Owner(s) | `apps/web` (the page, the actions, `lib/turso.ts`) · `tests/web` · `infra/terraform/cloudflare-d1` · `packages/db` + `infra/db-migrate` (the schema, TU5) · `tests/db` |
| Builds on | `cirrus-baseline`: its `cloudflare-d1` root and the `@@wiring(...)@@` deploy-time render; the `kv-redis-starter` port's binding shape |
| Upstream | [vercel/next.js `examples/with-turso`](https://github.com/vercel/next.js/tree/canary/examples/with-turso) |
| Changes | The client (libSQL → D1 binding, same `execute` shape), the Workers build, tests, the D1 root, the deploy contract; page copy says D1 |
| Decisions locked | (1) ~~The table is created on first use, as upstream does~~ — since TU5 the table is a migration (`packages/db`), applied by Cirrus's `db-migrate` shape between the D1 apply and the Worker's deploy (risk TU-A). (2) `wrangler.jsonc` rendered per environment — and, since TU5, committed as the fixture render, because the deploy lane checks it exists before the build (risk TU-G). (3) No local `dev.db` file: `wrangler dev` and `next dev` get a local D1 (`db:migrate:local` creates the table). (4) TU5: one landing — the plan, not a landing boundary, orders the database, its schema and the Worker. |
| Gate | TU1 is the first user-visible rung. TU2 applies only with a linked workspace; verified by `terraform validate`. |
| Shipped as | `baseline-v3` ([#7](https://github.com/sourceplane/turso-starter/pull/7), [#8](https://github.com/sourceplane/turso-starter/pull/8), TU6), `baseline-v2` ([#6](https://github.com/sourceplane/turso-starter/pull/6), one landing); `baseline-v1` is TU4's four-phase build ([#5](https://github.com/sourceplane/turso-starter/pull/5)). Proven offline (Baseline CI: a todo round-tripped through a local D1 under `wrangler dev`), deploy gated until a workspace is linked |

## Read order

1. `design.md` — what maps to what, the wiring flow, what is out of scope
2. `implementation-plan.md` — the milestones and what "done" means for each
3. `risks-and-open-questions.md` — what could go wrong and what was decided
4. `IMPLEMENTATION-STATUS.md` — what actually shipped (kept distinct from intent)

## Milestones at a glance

| Milestone | What it lands | Done when |
|---|---|---|
| TU0 — the spec | this doc set and the task contracts | merged on `main` |
| TU1 — the todos on D1 | `apps/web`, the rendered wrangler config, `tests/web` | `wrangler dev` lists todos from the local D1; Checks green |
| TU2 — the D1 database from Terraform | `infra/terraform/cloudflare-d1` | the root validates; the wiring keys match the template |
| TU3 — ready to instantiate | README, as-built status | a reader can run, test, preview and deploy it |
| TU4 — a baseline | card, build document (four phases, the database its own), rename, bootstrap tooling, tests | a new todo list goes from nothing to live, its D1 database included; Baseline CI green |
| TU5 — a baseline, in one landing | the build document rebuilt as `01-product` + `02-docs` (cirrus-baseline v22), the schema as migrations (`packages/db`, `infra/db-migrate`), the deploy-lane fixes | a new todo list goes from nothing to live in one landing, D1 applied, then migrated, then the Worker deployed; Baseline CI green |
| TU6 — the cirrus standard | no kiox, generated component docs, the context pack, status that agrees with the tags; the console card reads `subdomain` from the Cloudflare connection | Baseline CI green with the docs check |
