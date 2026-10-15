import { beforeEach, describe, expect, it, vi } from "vitest";

// A tiny in-memory stand-in for a D1 database: enough SQL to run the
// template's three statements (select, insert, delete). `tableExists` is
// whether the migrations ran: without them, D1 answers as it does for a
// missing table.
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
        if (!tableExists && /\btodos\b/.test(sql)) {
          throw new Error("D1_ERROR: no such table: todos: SQLITE_ERROR");
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
  getCloudflareContext: vi.fn(async () => ({ env: { DB: d1 } })),
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
  type Element = { type: string; props: Record<string, unknown> & { children?: unknown } };

  it("reads the migrated table, and renders an empty, hidden list on a fresh database", async () => {
    const { TodoList } = await import("@/app/todo-list");
    tableExists = true;
    const list = (await TodoList()) as unknown as Element;
    expect(list.type).toBe("ul");
    expect(list.props["data-todos"]).toBe(0);
    expect(list.props.hidden).toBe(true);
    expect(list.props.children).toEqual([]);
    // One read, and nothing created: the schema is the migrations' job.
    expect(calls.map((c) => c.sql)).toEqual(["SELECT * FROM todos"]);
  });

  it("lists every row, and says how many it read", async () => {
    const { TodoList } = await import("@/app/todo-list");
    tableExists = true;
    todos = [
      { id: 1, description: "write tests" },
      { id: 2, description: "ship it" },
    ];
    const list = (await TodoList()) as unknown as Element;
    expect(list.props["data-todos"]).toBe(2);
    expect(list.props.hidden).toBe(false);
    const items = list.props.children as Element[];
    expect(items.map((i) => (i.props.item as { description: string }).description)).toEqual([
      "write tests",
      "ship it",
    ]);
  });

  it("names the missing migrations instead of failing the page", async () => {
    const { TodoList } = await import("@/app/todo-list");
    const notice = (await TodoList()) as unknown as Element;
    expect(notice.type).toBe("p");
    expect(notice.props.role).toBe("alert");
    expect(JSON.stringify(notice.props.children)).toContain("db:migrate:local");
    expect(tableExists).toBe(false);
  });

  it("does not swallow any other database error", async () => {
    const { TodoList } = await import("@/app/todo-list");
    const { getCloudflareContext } = await import("@opennextjs/cloudflare");
    vi.mocked(getCloudflareContext).mockRejectedValueOnce(new Error("D1_ERROR: network down"));
    await expect(TodoList()).rejects.toThrow("network down");
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
