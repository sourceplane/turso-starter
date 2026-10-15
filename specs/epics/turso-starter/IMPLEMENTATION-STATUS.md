# turso-starter (TU) — Implementation status

As-built ≠ intent. This file records what actually shipped, and every place
the code departed from `design.md` or from the upstream template.

| Milestone | State | PR |
|---|---|---|
| TU0 — the spec | | |
| TU1 — the todos on D1 | | |
| TU2 — the D1 database from Terraform | | |
| TU3 — ready to instantiate | | |

## Departures from the upstream template

### `lib/turso.ts` speaks to D1

`createClient({ url, authToken })` from `@libsql/client` became a client
with the same `execute()` shape over `getCloudflareContext().env.DB`. No
`@libsql/client`, no `TURSO_DB_*`, no `dev.db`.

### `next.config.mjs` with `initOpenNextCloudflareForDev()`, standalone output

### Page copy

"Turso" → "D1"; the layout title → "Next.js + D1".

### Next 16.3.8, React 19, eslint-config-next 16 flat config (`react-hooks/refs` off)

The template floated `next: latest` with React 18 and `eslint-config-next 14`.
