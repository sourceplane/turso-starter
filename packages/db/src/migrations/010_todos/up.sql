-- The todo list's one table: the statement the upstream template ran on its
-- first render (app/todo-list.tsx), now applied by db-migrate before the
-- Worker deploys. IF NOT EXISTS, so a database whose table an older build
-- created on first use takes this migration as a no-op.
-- Owner: app
CREATE TABLE IF NOT EXISTS todos(id INTEGER PRIMARY KEY AUTOINCREMENT, description TEXT NOT NULL);
