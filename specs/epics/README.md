# Epics

Orun-style work programs. Each epic is a folder carrying `epic.yaml` (the
declaration the platform reads: slug, key prefix, milestones with exit
criteria and task keys) beside its doc set. The pull request that adds the
folder is the adoption; the merge creates the epic in the workspace.

| Epic | Cluster | Status | What it is |
|------|---------|--------|------------|
| [`turso-starter/`](./turso-starter/) | **TU** | 🟡 TU5 in review | Vercel's Next.js + Turso starter, equivalent in code and function, on Cloudflare Workers with the todos in D1 — and an Orun baseline that instantiates it in one landing, its database applied and migrated before the Worker deploys (TU4, rebuilt in TU5) |

As-built ≠ intent: what shipped lives in each epic's `IMPLEMENTATION-STATUS.md`.
