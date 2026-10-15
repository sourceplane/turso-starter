# Epic: turso-starter (TU)

**Turso is SQLite with a network in front of it; so is D1. Vercel's Turso starter is a todo list whose four SQL statements are plain SQLite, so the port changes one file: `lib/turso.ts` keeps the libSQL client's `execute()` shape — a string or `{ sql, args }` — over the `DB` D1 binding, and the table check, the create, the select, the insert and the delete run as written. The database comes from Terraform through Orun (the Cirrus baseline's own D1 root) and reaches the Worker through the wiring documents every binding in this programme uses.**

The port keeps the page, the form, the server actions and the todo list. It adds the Workers build, the monorepo wrapper, a test package that runs the actions and the list against an in-memory D1, the D1 Terraform root, and the deploy contract.

## Status

| Field | Value |
|-------|-------|
| Status | ✅ Shipped — TU0–TU3 landed (#1–#4); D1 apply and live deploy gated on a linked workspace |
| Cluster | **TU** (TU0–TU3) |
| Owner(s) | `apps/web` (the page, the actions, `lib/turso.ts`) · `tests/web` · `infra/terraform/cloudflare-d1` |
| Builds on | `cirrus-baseline`: its `cloudflare-d1` root and the `@@wiring(...)@@` deploy-time render; the `kv-redis-starter` port's binding shape |
| Upstream | [vercel/next.js `examples/with-turso`](https://github.com/vercel/next.js/tree/canary/examples/with-turso) |
| Changes | The client (libSQL → D1 binding, same `execute` shape), the Workers build, tests, the D1 root, the deploy contract; page copy says D1 |
| Decisions locked | (1) The table is still created on first use, as upstream does (no migration package for a one-table demo; Cirrus's `db-migrate` is the shape when it grows). (2) `wrangler.jsonc` rendered per environment; never committed. (3) No local `dev.db` file: `wrangler dev` and `next dev` get a local D1. |
| Gate | TU1 is the first user-visible rung. TU2 applies only with a linked workspace; verified by `terraform validate`. |
| Shipped as | `main` after [#4](https://github.com/sourceplane/turso-starter/pull/4); verified locally under `wrangler dev` with a local D1 |

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
