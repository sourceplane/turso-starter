import { TodoList } from "./todo-list";
import { Form } from "./form";

// The list reads D1 on every request. On Vercel the page was pre-rendered
// and refreshed by revalidatePath('/') through ISR; the Worker's static-assets
// cache is read-only, so the page renders dynamically instead.
export const dynamic = "force-dynamic";

export default function Home() {
  return (
    <main className="max-w-2xl mx-auto space-y-12 px-6 py-32">
      <div className="space-y-3 text-center">
        <h1 className="text-3xl font-medium">D1</h1>
        <p className="text-gray-500">SQLite on Cloudflare D1 (a Turso template port)</p>
      </div>

      <div className="space-y-3">
        <TodoList />
        <Form />
      </div>
    </main>
  );
}
