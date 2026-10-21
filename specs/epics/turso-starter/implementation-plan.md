# turso-starter — implementation plan

Milestones land in order; each task is one pull request on an
`orun/TU-n-<slug>` branch with an `Orun-Task: TU-n` trailer.

## TU0 — the spec ✅

**Done when**
- the five documents and `epic.yaml` are on `main`
- `tasks/TU-1..TU-4.TaskContract.yaml` exist

## TU1 — the todos on D1 ✅

**Done when**
- `pnpm install && pnpm run wire:fixture && pnpm typecheck && pnpm lint && pnpm test && pnpm build` is green locally and in `Checks`
- `wrangler dev` answers `/` with the form ("Insert new todo") after creating the table in the local D1; a row inserted through the binding shows on the next request

## TU2 — the D1 database from Terraform ✅

**Done when**
- `terraform validate` passes on the root
- the wiring keys the root outputs (`d1_database_id`, `d1_database_name`) are the ones the template's tokens name

## TU3 — ready to instantiate ✅

**Done when**
- the README quick start works from a fresh clone
- the status file lists every PR and departure

## TU4 — a baseline ✅ (#5; rebuilt by TU5)

`blueprint.yaml`, `repo-blueprint.yaml`, `.baseline/` (identity, task
contracts, the site's README), `tooling/rebrand`, `tooling/bootstrap`,
`hooks/render-deployment-docs.sh`, `ai/context/`, `docs/phases/`,
`BOOTSTRAP.md`, `testing/`, `baseline.yml` and `tag.yml` — portfolio-starter-kit's
recipe (PK3 and PK-5), with a `02-data` phase from virga's
`03-infrastructure` (design §6).

**Done when**
- orun at the bootstrap floor (v2.58.11) and at the lane pin (v2.78.4) reads
  `repo-blueprint.yaml`, and `testing/manifest.test.sh` holds the card to it
- `Baseline CI` is green: the contract tests, the leak gate, the offline
  bootstrap (`testing/placement.test.sh`) and the end-to-end tier
  (`testing/e2e.test.sh`)
- the status file records what is proven offline and what only a live
  bootstrap can prove

## TU5 — a baseline, in one landing ✅ (#6)

The build document rebuilt the cirrus-baseline v22 way (`01-product`,
`02-docs`), from `kv-redis-starter`'s KR4; the schema as migrations
(`packages/db`, `infra/db-migrate`, `tooling/migrations` shipped,
`tests/db`); and what the product needed to deploy from a fresh repository:
`wrangler.jsonc` committed, dev rendering the fixture, the enforced edges
`cloudflare-d1` → `db-migrate` → `web` on main (design §6).

**Done when**
- orun at the bootstrap floor (v2.58.11), the lane pin (v2.78.4) and the
  current CLI (v2.79.0) reads `repo-blueprint.yaml`, and
  `testing/manifest.test.sh` holds the card to it
- the product's own push-to-main plan applies `cloudflare-d1`, then
  `db-migrate`, then deploys `web`, on stage and prod
  (`testing/placement.test.sh`)
- `Baseline CI` is green: the contract tests, the wiring path, the leak gate,
  the offline bootstrap and the end-to-end tier (the migration lane included)
- the status file records what is proven offline and what only a live
  bootstrap can prove

## TU6 — the cirrus standard (TU-7, TU-8) ✅

Bring the baseline to cirrus-baseline's standard, with nothing about the
product itself changing.

- **No kiox.** `kiox.yaml`/`kiox.lock` pinned an orun (v2.15.0) that nothing
  ran: every workflow installs orun itself through `orun-action` with its own
  `version:`. The files, their two modules and the rebrand's skip entry go.
- **Component docs.** `tooling/catalog/gen-component-docs.py` writes each
  component's `docs/overview.md`, `docs/architecture.md` and `docs/runbook.md`
  from what the component declares, as cirrus-baseline's do; the pages ship
  with the component. Baseline CI runs it with `--check`.
- **The context pack.** `ai/context/current.md`, `decisions.md` and
  `open-risks.md` beside the two pages a product ships with — this
  repository's own, so no module places them.
- **Status that agrees with the tags.** TU4 is `baseline-v1`, TU5
  `baseline-v2`.
- **The subdomain from the Cloudflare connection (TU-8).** The card's
  `subdomain` input declares `from: connection.cloudflare.workersSubdomain`,
  as cirrus-baseline since `baseline-v23`: the console fills it from the
  connection the build is bound to and renders no field; `manifest.test.sh`
  accepts the source only while the card requires `cloudflare`. A hand-run
  build still passes `--set subdomain`.

**Done when**
- nothing outside this milestone's own record (its specs, task and context
  pages) names kiox, and the leak gate and the offline bootstrap pass
  without the two modules
- the docs check is green in Baseline CI
- this file, the status file and `epic.yaml` agree

## After TU5 (outside this repository)

1. Cut the tag with `tag.yml` from the merged `main` — done: TU5 is
   `baseline-v2` (`baseline-v1` is TU4's four-phase build).
2. Register the row in orun-cloud's `infra/baselines-registry/baselines.yaml`
   (unlisted, `manifestPath: blueprint.yaml`, `requires: [cloudflare]`) —
   its catalogue preflight refuses a tag that does not exist yet.
3. Bootstrap one site from the tag against a workspace whose Cloudflare
   token can mint D1 Edit as well as Workers Scripts; record its timings;
   then flip the row to public with a page on orunbase.com.

## Sequencing note

TU1's component already names the root's wiring secret; TU2 makes the name
true; since TU5 one convergence applies it, migrates it and deploys the
site that reads it, in that order. Applying it needs a workspace with a
Cloudflare connection whose token can mint the D1 scope (`d1-edit`).
