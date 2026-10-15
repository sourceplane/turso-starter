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
