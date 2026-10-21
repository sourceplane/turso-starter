# turso-starter — where this repository stands

The entry page for anyone (or any agent) picking this repository up. It is
this repository's own state and does not ship to a product built from it;
the two pages that do are [operations.md](operations.md) and
[deployment.md](deployment.md).

## What it is

Vercel's Next.js + Turso starter — a todo list — on Cloudflare Workers +
Static Assets, with the todos in a D1 database Terraform provisions and a
migration creates, packaged as an Orun baseline: `orun new --blueprint
repo-blueprint.yaml` builds a new product in its own repository and takes it
to live on stage and prod in one landing (`01-product`: cloudflare-d1 →
db-migrate → web per environment), then records what went live (`02-docs`).

## Release

| | |
|---|---|
| Latest tag | `baseline-v3` (TU6 — the cirrus standard: no kiox, generated component docs, this context pack, and the console card reading `subdomain` from the Cloudflare connection); `baseline-v2` is TU5 (one landing), `baseline-v1` TU4's four-phase build |
| Proven live | No. Everything short of the platform is proven offline in Baseline CI, the migration lane against a stand-in D1 API and a todo round-tripped through the built Worker included; a live bootstrap from a tag is still to come (risk TU-E) |

## Where to read

| Question | Page |
|---|---|
| What shipped, and every departure from upstream | `specs/epics/turso-starter/IMPLEMENTATION-STATUS.md` |
| Why it is built this way | [decisions.md](decisions.md), then `specs/epics/turso-starter/design.md` |
| What could still go wrong | [open-risks.md](open-risks.md), then `specs/epics/turso-starter/risks-and-open-questions.md` |
| How to instantiate it | `BOOTSTRAP.md`, `docs/phases/` |
| What each component is | `<component>/docs/` beside each `component.yaml` — `apps/web`, `packages/db`, `infra/db-migrate`, `infra/terraform/cloudflare-d1`, `tests/{web,db}` (generated; `python3 tooling/catalog/gen-component-docs.py`) |

## Next

1. Bootstrap one product from `baseline-v3` against a workspace whose
   Cloudflare token can mint D1 Edit as well as Workers Scripts (TU-F), and
   record its timings (closes TU-E).
