import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardHome() {
  const supabase = await createClient();
  const { data: events } = await supabase
    .from("events")
    .select("*, accounts(name)")
    .order("created_at", { ascending: false });

  const grouped = new Map<string, { name: string; events: typeof events }>();
  for (const e of events ?? []) {
    const accName = (e as unknown as { accounts: { name: string } | null }).accounts?.name ?? "Account";
    const g = grouped.get(e.account_id) ?? { name: accName, events: [] };
    g.events!.push(e);
    grouped.set(e.account_id, g);
  }

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8">
      <h1 className="text-2xl font-semibold text-zinc-900">Your events</h1>

      {[...grouped.entries()].map(([accountId, g]) => (
        <div key={accountId}>
          <h2 className="mb-2 text-sm font-medium text-zinc-500">{g.name}</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {g.events!.map((e) => (
              <Link
                key={e.id}
                href={`/dashboard/events/${e.id}`}
                className="rounded-lg border border-zinc-200 bg-white p-4 hover:border-zinc-400"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-zinc-900">{e.name}</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      e.status === "active"
                        ? "bg-green-100 text-green-700"
                        : "bg-zinc-200 text-zinc-600"
                    }`}
                  >
                    {e.status}
                  </span>
                </div>
                <div className="mt-1 font-mono text-xs text-zinc-400">/e/{e.slug}</div>
              </Link>
            ))}
          </div>
        </div>
      ))}

      {grouped.size === 0 && (
        <p className="text-zinc-400">No events yet. Ask the platform admin to create one for you.</p>
      )}
    </div>
  );
}
