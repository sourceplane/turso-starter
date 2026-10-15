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

## TU4 — a baseline

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

## After TU4 (outside this repository)

1. Cut `baseline-v1` with `tag.yml` from the merged `main`.
2. Register the row in orun-cloud's `infra/baselines-registry/baselines.yaml`
   (unlisted, `manifestPath: blueprint.yaml`, `requires: [cloudflare]`) —
   its catalogue preflight refuses a tag that does not exist yet.
3. Bootstrap one site from the tag against a workspace whose Cloudflare
   token carries D1 Write; record its timings; then flip the row to public
   with a page on orunbase.com.

## Sequencing note

TU1's component already names the root's wiring secret; TU2 makes the name
true; TU4's `02-data` phase applies it before `03-site` deploys the site that
reads it. Applying it needs a workspace with a Cloudflare connection whose
token can mint the D1 scope (`d1-edit`).
