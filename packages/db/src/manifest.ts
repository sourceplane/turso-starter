import type { MigrationManifest } from "./types.js";

// Every migration the runner applies, in order, with the sha256 of its file.
// `pnpm --filter @saas/db run manifest:check` verifies the checksums;
// `manifest:fix` rewrites them after a migration file changes (only ever
// before that migration has been applied anywhere — an applied migration's
// checksum is immutable).
export const manifest: MigrationManifest = {
  version: 1,
  migrations: [
    {
      id: "000_control_baseline",
      context: "control",
      path: "000_control/up.sql",
      checksum:
        "c7f11499fa82d6fd2baa1af7fc75eeb73cd7be252af2e56841509c66001d638b",
      description:
        "Baseline control migration — creates the migration tracking schema",
    },
    {
      id: "010_todos",
      context: "app",
      path: "010_todos/up.sql",
      checksum:
        "6eece2f0cf94172849463da71994d16d535491f866eece4ffbfc62fc8734dbfb",
      description:
        "The todos table — id INTEGER PRIMARY KEY AUTOINCREMENT, description TEXT NOT NULL — as the upstream template created it on first use",
    },
  ],
};
