# turso-starter — risks and open questions

## TU-A — Create-on-first-use in production (ACCEPTED, as upstream)

The template creates its table on the first render; the comment says to
remove it in production. The port keeps it (and the comment). A product
built on this adds Cirrus's `db-migrate` component and a migration.

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

TU4 is proven offline: the contract tests, the leak gate, the offline
bootstrap of all four phases and the end-to-end tier (built in the staged
lane, dry-deployed, served under `wrangler dev`, smoked, and a todo
round-tripped through a local D1) are green. Nothing short of a bootstrap
against a workspace proves the platform's half: the `d1-edit` mint, the
Terraform apply and its wiring publish, the deploy and the workers.dev
probes. The registry row stays `unlisted` until one has run end to end, and
`expectedMinutes` is the phases' estimate (18) until then.

## TU-F — A Cloudflare token without D1 Write (ACCEPTED, documented)

The console's Cloudflare connection is the one credential a bootstrap
needs, and it must be able to mint `d1-edit` as well as `workers-deploy`.
A token without D1 Write gets through `01-scaffold` and stops at `02-data`'s
`secret-d1-edit` hook (`parent_grant_insufficient`). That is the right place
to stop — before anything touches Cloudflare — and BOOTSTRAP.md names the
fix: re-issue the token with D1 Write, re-connect, re-run `02-data`.
