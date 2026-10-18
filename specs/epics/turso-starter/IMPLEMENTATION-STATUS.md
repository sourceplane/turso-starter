# turso-starter (TU) — Implementation status

As-built ≠ intent. This file records what actually shipped, and every place
the code departed from `design.md` or from the upstream template.

| Milestone | State | PR |
|---|---|---|
| TU0 — the spec | ✅ Shipped | [#1](https://github.com/sourceplane/turso-starter/pull/1) |
| TU1 — the todos on D1 | ✅ Shipped | [#2](https://github.com/sourceplane/turso-starter/pull/2) |
| TU2 — the D1 database from Terraform | ✅ Shipped (validated; apply gated on a linked workspace) | [#3](https://github.com/sourceplane/turso-starter/pull/3) |
| TU3 — ready to instantiate | ✅ Shipped | [#4](https://github.com/sourceplane/turso-starter/pull/4) |
| TU4 — a baseline | ✅ Shipped (four phases; rebuilt by TU5) | [#5](https://github.com/sourceplane/turso-starter/pull/5) (TU-5), tagged `baseline-v1` |
| TU5 — a baseline, in one landing | ✅ Shipped (offline-proven; no live bootstrap yet, risk TU-E) | [#6](https://github.com/sourceplane/turso-starter/pull/6) (TU-6), tagged `baseline-v2` |
| TU6 — the cirrus standard | ✅ Shipped | TU-7 — on `main` after `baseline-v2`, not yet tagged |

## Departures from the upstream template

### The site's name and source link live in `lib/site.ts` (TU4)

Upstream's page is headed "Turso" (the port's: "D1") and titled
"Next.js + Turso". Both now read `SITE_NAME`, and a "source" link under the
heading reads `SOURCE_URL`, so the rename can make a copy somebody else's in
two literals. Upstream's `apps/web/README.md` (Turso setup) is replaced by
one about this site.

### The table is a migration, not a first-render create (TU5)

Upstream's `TodoList` checked `sqlite_master` and ran `CREATE TABLE todos(…)`
on the first render, with a comment to remove that in production. The same
statement, made `IF NOT EXISTS`, is `packages/db/src/migrations/010_todos`,
applied by the `db-migrate` component after the D1 apply and before the
Worker deploys; the list only selects. A database without the table (wrangler's
local D1 before `pnpm db:migrate:local`) renders a notice instead of a 500.
The list is wrapped in a `<ul data-todos="N">` — upstream rendered bare `<li>`s
— so the deploy's smoke can see that the Worker read the migrated table.

### `lib/turso.ts` speaks to D1

`createClient({ url, authToken })` from `@libsql/client` became a client
with the same `execute()` shape over `getCloudflareContext().env.DB`. No
`@libsql/client`, no `TURSO_DB_*`, no `dev.db`.

### `dynamic = "force-dynamic"` on `app/page.tsx`

Upstream's page is pre-rendered at build and refreshed by
`revalidatePath('/')` through ISR. The Worker serves pre-rendered pages
from a read-only static-assets cache, so a pre-rendered list would never
show a new todo; the page renders on every request instead (the actions
still call `revalidatePath`, now a no-op).

### `next.config.mjs` with `initOpenNextCloudflareForDev()`, standalone output

### Page copy

"Turso" → "D1"; the layout title → "Next.js + D1".

### Next 16.3.8, React 19, eslint-config-next 16 flat config (`react-hooks/refs` off)

The template floated `next: latest` with React 18 and `eslint-config-next 14`.

## Departures from TU4 (TU5)

| What | TU4 | TU5 | Why |
|---|---|---|---|
| the build | four phases (`01-scaffold`, `02-data`, `03-site`, `04-docs`), three landings that deploy | two: `01-product` places everything and lands it as ONE pull request; `02-docs` is hook-only | cirrus-baseline v22: the plan, not a landing boundary, carries the order |
| the order on main | a phase boundary: `02-data`'s apply, then `03-site`'s deploy | `dependsOn` edges `mode: enforced` on `github-push-main`, advisory on `github-pull-request`: `db-migrate` → `cloudflare-d1`; `web` → both | a job resolves its secrets when it starts, so each finds what the apply before it published |
| the schema | created by the page on first render (risk TU-A) | `packages/db` (migrations + Cirrus's D1 REST runner) run by `infra/db-migrate`, between the apply and the deploy | the convergence's order then includes the schema; the page never writes DDL |
| `tooling/migrations` | stayed in the baseline (nothing referenced it) | ships: `manifest.mjs` (the checksum check), `local.mjs` (`db:migrate:local`) | the product's `packages/db` scripts call them |
| `apps/web/wrangler.jsonc` | git-ignored, rendered by the build | committed as the fixture render, GENERATED banner; Checks diffs it | the deploy lane's `verify-app-structure` checks it exists BEFORE the build — every lane would have failed (risk TU-G) |
| dev's render | `live.mjs --env dev` → no document → red | `--fixture wiring.fixture.json --fixture-envs dev`; the fixture has a `dev` entry | dev is verify-only; no root applies there (risk TU-H) |
| `apps/web` smoke | `grep 'Insert new todo'` (the form, which renders whether or not D1 answered usefully) | `data-todos="N"` — only a Worker that queried the migrated table renders it | proves the binding, the schema and the Worker in one read; read-only, so no deploy writes a todo |
| brokered secrets | minted across `02-data` and `03-site` | all three in `01-product`: `CLOUDFLARE_API_TOKEN` (`workers-deploy`), `CLOUDFLARE_D1_TOKEN` (`d1-edit`), `CLOUDFLARE_ACCOUNT_ID` | one landing, one set of reconciles before it |
| the landing's await | per phase | `orun.run/watch@v1` on the merge sha, `orun.secrets/exists@v1` for `WIRING_CLOUDFLARE_D1` on stage and prod, `orun.http/probe@v1` on both URLs | cirrus-baseline v22's await |
| `intent.yaml` comments | the stack-tectonic pin's comment named `testing/e2e.test.sh`, and it ships (only the `work:` block's comment is stripped) | the reference's wording | the leak gate: a shipped file names no factory path |
| the D1 root's prose | Cirrus's "every bounded context's tables", "the console's read paths", "this fork" | the todos database; the schema is the migrations' | it ships into every product; no resource address changed |
| `tooling/wire/render.mjs` | copied the template's header comment | writes a GENERATED banner | the committed render must say it is one |
| e2e | built and dry-deployed the stage lane (no `verify-app-structure`) | + `verify-app-structure`; + the db-migrate lane's install, build, offline plan and apply against a stand-in D1 REST API over real SQLite; + the smoke refusing a page with no schema | the tier must run what the lanes run |

## Verified (TU1–TU3)

- Local: `pnpm run wire:fixture`, `pnpm typecheck`, `pnpm lint`, `pnpm test`
  (3 tests), `pnpm build` green; `wrangler dev` with a local D1: `/` 200
  ("Insert new todo", the table created on first render), a row inserted
  with `wrangler d1 execute --local` shows on the next request.
- `terraform validate` green on `infra/terraform/cloudflare-d1`.
- CI: `Checks` green on #2 and #3.
- Not verified: the D1 apply and a live deploy — both need the product
  linked to an Orun workspace with a Cloudflare connection whose token can
  mint the D1 scope (`ORUN_CI`); the form's server actions in a browser
  (they are exercised by the tests).

## Verified (TU4)

- Locally, orun 2.75.0: `testing/{manifest,phases,coverage,rebrand,retouch,bootstrap-defer}.test.sh`,
  `testing/leak.test.sh`, `testing/placement.test.sh` (the offline bootstrap of
  `acme-todos`, "Sam's Notes & Links", all four phases; the D1 root and the
  site's D1 wiring re-tenanted; the site's own `orun plan` at `03-site`) and
  `testing/e2e.test.sh` (that site's Checks; its stage lane's build — with the
  wiring document the runner would resolve — verify and dry-run deploy in the
  staged tree; `wrangler dev`; the component's own smoke; a todo added,
  listed and removed through D1) all green; the repository's own
  `pnpm typecheck`, `lint`, `test` and `build` green.
- Not verified: a live bootstrap (risks TU-E), and orun at the CI pins
  (v2.58.11 and v2.78.4) — Baseline CI runs both on this pull request.

## Verified (TU5)

See the pull request for the run log. In short, under orun 2.79.0, v2.78.4
(the lane pin) and v2.58.11 (the bootstrap floor) as each tier requires:

- `orun new --status` reads the blueprint at v2.58.11, v2.78.4 and 2.79.0:
  `01-product` 90 files, `02-docs` hook-only. `orun validate` and
  `orun work check` clean.
- `testing/{manifest,phases,coverage,rebrand,retouch,bootstrap-defer,wire}.test.sh`
  green; `phases` now also fails a deployable that binds the migrated database
  without waiting for `db-migrate` (mutation-checked).
- `testing/leak.test.sh`: nothing of the factory ships and no shipped file
  names it.
- `testing/placement.test.sh` (fixture "Sam's Todos & Lists" /
  `acme-inc/acme-todo-starter`): two landings; rebrand `--verify` clean; the
  page, the Worker, the D1 names, the runner and every secret ref the
  product's; workspace re-tenanted, `work:` stripped, promotion and dev lanes
  restored; record rendered. The product's own
  `orun plan --trigger github-push-main` for the 01-product merge, per
  environment: `cloudflare-d1` apply (level 0) → `db-migrate` apply (level 1,
  waiting on that apply alone) → `web` deploy (level 2, waiting on both
  alone), stage and prod side by side, nothing on dev; on a pull request
  nothing waits; the 02-docs merge plans 0 jobs; `--resume` changes nothing.
- `testing/e2e.test.sh`: the 01-product landing passes the Checks sequence;
  in job trees staged as orun stages them, the stage web lane's
  `verify-app-structure`, `build-app` (rendering the stage document's
  database id), `verify-build-output` and `deploy-dry-run` pass; the stage
  db-migrate lane builds `@saas/db`, plans offline, applies both migrations
  to a stand-in D1 REST API (refusing any other account, database or token)
  and applies nothing the second time; `wrangler dev` serves the built
  Worker: without the schema it renders the notice and the component's own
  smoke refuses it; after `db:migrate:local` the smoke passes, `/` carries
  the product's name and link, and a todo is added, listed and removed
  through the page's own server actions.
- The repository's own Checks sequence (`pnpm install --frozen-lockfile`,
  `wire:fixture` + `git diff --exit-code`, typecheck, lint, test — 21 tests
  — build) green; `terraform validate` green on `infra/terraform/cloudflare-d1`.
- Not verified: a live bootstrap against a workspace (risk TU-E).

## The cirrus standard (TU6)

Nothing about the product changed. What changed is the baseline around it:

| What | Before | After | Why |
|---|---|---|---|
| orun pin | `kiox.yaml` (v2.15.0) + `kiox.lock`, shipped to every product | gone; orun is pinned where it runs, the `orun-action` `version:` in each workflow | nothing ran the kiox pin, and it disagreed with the lanes (v2.78.4) |
| `root-kiox`, `root-kiox-lock` modules | in `01-product` | removed (`testing/phases.test.sh` and the rebrand's skip list follow) | a product is placed with 106 files: 90 − 2 kiox + 18 docs pages |
| component docs | none | `docs/overview.md`, `architecture.md`, `runbook.md` beside each of the six `component.yaml` (`apps/web`, `packages/db`, `infra/db-migrate`, `infra/terraform/cloudflare-d1`, `tests/{web,db}`) | cirrus-baseline documents every component; the workspace Docs library renders `docs/` beside each `component.yaml` |
| how the docs stay true | — | `tooling/catalog/gen-component-docs.py` derives them from the manifest, the Worker config, Terraform, the migrations and package scripts; Baseline CI runs it with `--check` | a hand-written copy of a manifest drifts silently |
| context pack | `operations.md`, `deployment.md` | plus `current.md`, `decisions.md`, `open-risks.md` | cirrus-baseline's shape; the three new pages are this repository's own and no module places them (the leak gate still allows exactly two) |
| status | TU5 "in review … to be tagged `baseline-v1`"; an unlabeled Verified section ("the table created on first render", 3 tests) | TU4 `baseline-v1`, TU5 `baseline-v2`; the section is labeled TU1–TU3 | the tags existed; the documents had not caught up |

## Verified (TU6)

- `testing/{manifest,phases,coverage,rebrand,retouch,bootstrap-defer,wire}.test.sh`
  green; `gen-component-docs.py --check` green (6 components, 18 pages).
- `orun new --status` (v2.58.11, the bootstrap floor): `01-product` 106
  files, `02-docs` hook-only.
- `testing/leak.test.sh` (v2.58.11): 106 files derived (90 − 2 kiox + 18
  docs pages); ai/context still exactly the two declared pages; 100 shipped
  sources name no factory path.
- `testing/placement.test.sh` (v2.78.4, as Baseline CI runs it): 106 files
  placed, both landings, branded, re-tenanted, record rendered; the
  product's own plan for the 01-product merge: `cloudflare-d1` (level 0) →
  `db-migrate` (level 1) → `web` (level 2) on stage and prod side by side;
  on a pull request nothing waits; the 02-docs merge plans 0 jobs;
  `--resume` changes nothing.
- `pnpm install --frozen-lockfile`, `wire:fixture` + `git diff
  --exit-code`, `typecheck`, `lint`, `test` (21 tests: 7 in `tests/web`, 14
  in `tests/db`), `build` green.
- `testing/e2e.test.sh` (v2.78.4): the 01-product landing passes the Checks
  sequence; the stage web lane's `verify-app-structure`, `build-app` (the
  stage document's database id), `verify-build-output` and
  `deploy-dry-run` pass in the staged job tree; the stage db-migrate lane
  plans offline, applies both migrations to the stand-in D1 API and applies
  nothing the second time; under `wrangler dev` the page without a schema
  is refused by the smoke, and after `db:migrate:local` the smoke passes and
  a todo is added, listed and removed through the page's own server
  actions.
- `orun task check TU-7` complete.

## Versions

| Package | Version | Why |
|---|---|---|
| next | 16.3.8 | newest inside `@opennextjs/cloudflare` 1.20.11's peer range |
| @opennextjs/cloudflare | ^1.20.11 | `getCloudflareContext` for the binding |
| wrangler | ^4.151.0 | compatibility_date 2026-10-01 |
