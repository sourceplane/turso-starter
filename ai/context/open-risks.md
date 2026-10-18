# turso-starter — open risks

What is not yet proven or not yet decided. The full write-up of every risk,
including the accepted and resolved ones, is
`specs/epics/turso-starter/risks-and-open-questions.md`; this page lists only
what is still live, so it should be short.

| ID | Risk | State | What closes it |
|---|---|---|---|
| TU-E | Not yet proven live: the `d1-edit` mint, the Terraform apply and its wiring publish, the migrations against the real D1 API, the deploy and the workers.dev probes | OPEN | One bootstrap from a tag against a workspace whose Cloudflare token can mint D1 Edit |

Accepted, and worth knowing before you change them: TU-B (D1's limits),
TU-F (a Cloudflare token without D1 Write stops the bootstrap before the
landing), TU-I (the bootstrap floor plans every edge enforced), TU-J (the
migrations package is named `@saas/db`), TU-K (a custom domain is the
owner's step).
