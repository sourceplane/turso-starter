import { type TodoItem, Todo } from "./todo";

import { db } from "@/lib/turso";

// The `todos` table is a migration (packages/db), applied by the db-migrate
// component before this Worker deploys — upstream created it on the first
// render instead, and said to remove that in production. A database without
// it (locally, before `pnpm db:migrate:local`) gets a notice, not a 500.
const NO_TABLE = /no such table: todos\b/;

export async function TodoList() {
  let rows: TodoItem[];
  try {
    const result = await db.execute("SELECT * FROM todos");
    rows = result.rows as unknown as TodoItem[];
  } catch (error) {
    if (!NO_TABLE.test(String(error))) throw error;
    return (
      <p role="alert" className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
        The database has no <code>todos</code> table yet. Apply the migrations — locally,{" "}
        <code>pnpm --filter @app/web db:migrate:local</code>; a deploy applies them before the site goes live.
      </p>
    );
  }

  // `data-todos` is the number of rows this render read from D1: the deploy's
  // smoke looks for it, because only a Worker that queried the migrated table
  // renders it. Hidden while empty, as upstream rendered nothing.
  return (
    <ul className="space-y-3" data-todos={rows.length} hidden={rows.length === 0}>
      {rows.map((row, index) => (
        <Todo
          key={index}
          item={{
            id: row.id,
            description: row.description,
          }}
        />
      ))}
    </ul>
  );
}
