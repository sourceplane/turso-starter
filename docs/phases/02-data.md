# 02-data — the database

**Places** `infra/terraform/cloudflare-d1` — one D1 database per
environment, the todos' store.

**Requires** `01-scaffold` placed, and both connections live — GitHub (the
owner's App installation) and Cloudflare — probed, waited for up to ten
minutes, so the Cloudflare consent can be clicked while it waits.

This is the first phase that touches Cloudflare, and the first that WRITES a
credential: a builder- or viewer-role API key gets through `01-scaffold` and
dies here, on the secret reconcile, with the re-mint-as-admin hint.

## What runs

| hook | what it does |
|---|---|
| `task` (pre) | finds the phase's task and yields its key |
| `secret-d1-edit` (pre) | `orun.integrations/reconcile@v1` — ensures `CLOUDFLARE_D1_TOKEN`, brokered from the Cloudflare connection with the `d1-edit` scope. The Terraform root authenticates with it; the `workers-deploy` token deliberately cannot touch D1 |
| `secret-account-id` (pre) | ensures `CLOUDFLARE_ACCOUNT_ID`, the connection fact |
| `retouch` | the redeploy marker on `infra/terraform/cloudflare-d1/component.yaml` (`.baseline/tasks/02-data.TaskContract.yaml`'s `affects`) |
| `stage`, `rebrand`, `restage`, `rebrand-verify` | brands what this phase placed: the database's name, the Terraform state key and the secret refs carry the site's slug |
| `land` | one PR, merged without waiting on its checks (`wait: false`) — the convergence is the gate |

**The `d1-edit` mint is refused unless the account API token's permission
groups include D1 Write.** That is an operator action no script can take; see
BOOTSTRAP.md.

## Then

`await` watches the convergence the merge started: `orun plan --changed`
plans `cloudflare-d1` on stage and prod, and Terraform applies it. Then
`orun.secrets/exists@v1` re-lists `WIRING_CLOUDFLARE_D1` on stage and prod —
the document `tooling/wire/live.mjs` renders into the site's `wrangler.jsonc`
at deploy time, which is why no database id is ever committed. `03-site`
cannot deploy without it.
