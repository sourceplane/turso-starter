import { beforeEach, describe, expect, it, vi } from "vitest";

// A tiny in-memory stand-in for a D1 database: enough SQL to run the
// template's four statements (table check, create, select, insert, delete).
type Row = { id: number; description: string };
let todos: Row[] = [];
let tableExists = false;
let nextId = 1;
const calls: { sql: string; args: unknown[] }[] = [];

const d1 = {
  prepare(sql: string) {
    let args: unknown[] = [];
    const stmt = {
      bind(...a: unknown[]) {
        args = a;
        return stmt;
      },
      async all() {
        calls.push({ sql, args });
        if (sql.startsWith("SELECT name FROM sqlite_master")) {
          return { results: tableExists ? [{ name: "todos" }] : [], meta: { changes: 0 } };
        }
        if (sql.startsWith("CREATE TABLE")) {
          tableExists = true;
          return { results: [], meta: { changes: 0 } };
        }
        if (sql === "SELECT * FROM todos") return { results: [...todos], meta: { changes: 0 } };
        if (sql.startsWith("INSERT INTO todos")) {
          todos.push({ id: nextId++, description: String(args[0]) });
          return { results: [], meta: { changes: 1 } };
        }
        if (sql.startsWith("DELETE FROM todos")) {
          const before = todos.length;
          todos = todos.filter((t) => String(t.id) !== String(args[0]));
          return { results: [], meta: { changes: before - todos.length } };
        }
        throw new Error(`unexpected sql: ${sql}`);
      },
    };
    return stmt;
  },
};
vi.mock("@opennextjs/cloudflare", () => ({
  getCloudflareContext: async () => ({ env: { DB: d1 } }),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

beforeEach(() => {
  todos = [];
  tableExists = false;
  nextId = 1;
  calls.length = 0;
});

describe("lib/turso (the libSQL execute shape over D1)", () => {
  it("runs a plain statement and a parameterised one", async () => {
    const { db } = await import("@/lib/turso");
    tableExists = true;
    await db.execute({ sql: "INSERT INTO todos (description) VALUES (?)", args: ["write tests"] });
    const result = await db.execute("SELECT * FROM todos");
    expect(result.rows).toEqual([{ id: 1, description: "write tests" }]);
    expect(calls[0]).toEqual({ sql: "INSERT INTO todos (description) VALUES (?)", args: ["write tests"] });
  });
});

describe("the todo list and its actions", () => {
  it("creates the table on first render, then lists nothing", async () => {
    const { TodoList } = await import("@/app/todo-list");
    expect(await TodoList()).toBeNull();
    expect(tableExists).toBe(true);
    expect(calls.map((c) => c.sql.split(" ").slice(0, 2).join(" "))).toEqual([
      "SELECT name",
      "CREATE TABLE",
      "SELECT *",
    ]);
  });

  it("adds and removes todos through the server actions", async () => {
    const { addTodo, removeTodo } = await import("@/app/actions");
    const { revalidatePath } = await import("next/cache");
    tableExists = true;
    const add = new FormData();
    add.set("description", "buy milk");
    await addTodo(add);
    expect(todos).toEqual([{ id: 1, description: "buy milk" }]);
    const remove = new FormData();
    remove.set("id", "1");
    await removeTodo(remove);
    expect(todos).toEqual([]);
    expect(revalidatePath).toHaveBeenCalledWith("/");
  });
});
