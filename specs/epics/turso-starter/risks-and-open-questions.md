# turso-starter — risks and open questions

## TU-A — Create-on-first-use in production (RESOLVED in TU5)

The template created its table on the first render, and said to remove that
in production. TU1–TU4 kept it. TU5 removed it: the statement is
`packages/db`'s `010_todos` migration, applied by Cirrus's `db-migrate`
shape between the D1 apply and the Worker's deploy, so the schema is part of
the one convergence and the page never writes DDL. A database that has not
been migrated (wrangler's local D1 before `pnpm db:migrate:local`) renders a
notice naming the fix, and the deploy's smoke refuses it.

## TU-B — D1's limits (ACCEPTED)

No interactive transactions, per-database size caps. The template needs
neither; a bigger product on the Cirrus baseline carries the same caveat.

## TU-C — Page copy (RESOLVED)

"Turso" / "Local SQLite with libSQL and Turso" read "D1" / "SQLite on
Cloudflare D1 (a Turso template port)"; the layout title is "Next.js + D1".

## TU-D — ISR on a read-only cache (RESOLVED)

The static-assets incremental cache cannot be revalidated, so a
pre-rendered `/` would freeze the todo list. `dynamic = "force-dynamic"`
renders it per request; the R2 incremental cache + Durable Object queue is
the alternative that keeps ISR (the commerce port uses it) and is
overkill for one page.

## TU-E — Not yet proven live (OPEN)

TU5 is proven offline: the contract tests, the leak gate, the offline
bootstrap of both phases with the product's own plan (D1 apply → migrations
→ deploy, per environment) and the end-to-end tier (built in the staged
lane, the migration lane's real apply against a stand-in D1 REST API,
dry-deployed, served under `wrangler dev`, smoked, and a todo round-tripped
through a local D1) are green. Nothing short of a bootstrap against a
workspace proves the platform's half: the `d1-edit` mint, the Terraform
apply and its wiring publish, the migrations against the real D1 API, the
deploy and the workers.dev probes. The registry row stays `unlisted` until
one has run end to end, and `expectedMinutes` is the phases' estimate (16)
until then.

## TU-F — A Cloudflare token without D1 Write (ACCEPTED, documented)

The console's Cloudflare connection is the one credential a bootstrap
needs, and it must be able to mint `d1-edit` as well as `workers-deploy`.
A token without D1 Write stops at `01-product`'s `secret-d1-edit` hook
(`parent_grant_insufficient`), after the repository exists and before the
landing. That is the right place to stop — before anything touches
Cloudflare — and BOOTSTRAP.md names the fix: re-issue the token with D1
Edit, re-connect, re-run `01-product`.

## TU-G — The deploy lane checked for a config only the build makes (RESOLVED in TU5)

stack-tectonic's `cloudflare-workers-assets-turbo` runs `verify-app-structure`
— `test -f package.json`, `test -f <wranglerConfig>` — BEFORE `build-app`, in
a job tree staged from the checkout. `wrangler.jsonc` was git-ignored and
rendered only by the build, so every Orun lane of the product would have
failed at that step; TU4's e2e did not run it. Fix (kv-redis-starter's
KR-E): commit `wrangler.jsonc` as the fixture render with a GENERATED
banner; the build still re-renders it for its environment. Checks fails when
the two disagree, and `testing/e2e.test.sh` runs the step in a staged tree.

## TU-H — The dev lane had no wiring document to render (RESOLVED in TU5)

`buildCommand` rendered with `live.mjs --env "${ORUN_ENVIRONMENT}"`, which
needs `WIRING_CLOUDFLARE_D1_<ENV>`; no root applies to `dev`, so every dev
lane would have failed in `build-app`. Fix (KR-F): `--fixture
wiring.fixture.json --fixture-envs dev`, and a `dev` fixture entry. stage and
prod still refuse to render without the real document
(`testing/wire.test.sh`).

## TU-I — The bootstrap floor plans every edge enforced (ACCEPTED)

orun v2.58.11 — the floor for RUNNING a bootstrap — does not apply a
`dependsOn` edge's `modeRules`: it plans a pull request with `web` waiting
on the D1 and migration plans. That CLI never plans the product's CI (its
`ci.yml` pins v2.78.4, which applies them), and on a push to main both
agree. The placement tier plans as the product does: `baseline.yml` runs it
under the lane pin, and the test refuses an orun older than `ci.yml`'s pin.

## TU-J — The migration package is named `@saas/db` (ACCEPTED)

stack-tectonic's `db-migrate` composition runs `turbo run build
--filter=@saas/db` and `node ../../dist/runner/cli.js` from the component's
path. The package therefore carries that name in a repository whose own
packages are `@app/*`; renaming it would need a composition parameter that
does not exist yet. The rename engine does not touch it (it is not identity).

## TU-K — A custom domain is the owner's step (ACCEPTED)

Attaching a domain to a Worker needs zone permissions the brokered
`workers-deploy` token does not carry. The product's README says how to
attach one; nothing in the repository changes, because the page renders no
absolute link to itself.
