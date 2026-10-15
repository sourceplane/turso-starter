import { getCloudflareContext } from "@opennextjs/cloudflare";

// The libSQL client's `execute` shape over Cloudflare D1: the app's queries
// (`db.execute("SELECT …")` and `db.execute({ sql, args })`) stay as written.
// D1 is SQLite too, so the SQL is the same; the binding is the credential
// (no TURSO_DB_URL / TURSO_DB_TOKEN).

export type InStatement = string | { sql: string; args?: ReadonlyArray<unknown> };

export interface ResultSet {
  rows: Record<string, unknown>[];
  rowsAffected: number;
}

export interface Client {
  execute(stmt: InStatement): Promise<ResultSet>;
}

export function createClient(binding: D1Database): Client {
  return {
    async execute(stmt) {
      const sql = typeof stmt === "string" ? stmt : stmt.sql;
      const args = typeof stmt === "string" ? [] : [...(stmt.args ?? [])];
      const result = await binding
        .prepare(sql)
        .bind(...args)
        .all<Record<string, unknown>>();
      return { rows: result.results ?? [], rowsAffected: result.meta?.changes ?? 0 };
    },
  };
}

export const db: Client = {
  async execute(stmt) {
    const { env } = await getCloudflareContext({ async: true });
    return createClient(env.DB).execute(stmt);
  },
};
