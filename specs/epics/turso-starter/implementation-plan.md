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

## Sequencing note

TU1's component already names the root's wiring secret; TU2 makes the name
true. Applying TU2 needs a workspace with a Cloudflare connection whose
token can mint the D1 scope (`d1-edit`).
