import Link from "next/link";
import { CalendarRange, CheckCircle2, PauseCircle, Ticket } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/dashboard/page-header";
import { StatCard } from "@/components/dashboard/stat-card";

export default async function DashboardHome() {
  const supabase = await createClient();
  const [{ data: events }, { data: tickets }] = await Promise.all([
    supabase.from("events").select("*, accounts(name)").order("created_at", { ascending: false }),
    supabase.from("tickets").select("event_id, status"),
  ]);

  const issuedByEvent = new Map<string, number>();
  for (const t of tickets ?? []) {
    issuedByEvent.set(t.event_id, (issuedByEvent.get(t.event_id) ?? 0) + 1);
  }

  const grouped = new Map<string, { name: string; events: typeof events }>();
  for (const e of events ?? []) {
    const accName = (e as unknown as { accounts: { name: string } | null }).accounts?.name ?? "Account";
    const g = grouped.get(e.account_id) ?? { name: accName, events: [] };
    g.events!.push(e);
    grouped.set(e.account_id, g);
  }

  const total = events?.length ?? 0;
  const active = (events ?? []).filter((e) => e.status === "active").length;
  const closed = total - active;
  const totalIssued = tickets?.length ?? 0;

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8">
      <PageHeader title="Events" subtitle="Every event across the accounts you belong to." />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard icon={CalendarRange} label="Total events" value={total} color="zinc" />
        <StatCard icon={CheckCircle2} label="Active" value={active} color="emerald" />
        <StatCard icon={PauseCircle} label="Closed" value={closed} color="blue" />
        <StatCard icon={Ticket} label="Tickets issued" value={totalIssued} color="amber" />
      </div>

      {[...grouped.entries()].map(([accountId, g]) => (
        <div key={accountId}>
          <h2 className="mb-3 text-sm font-semibold text-zinc-500">{g.name}</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {g.events!.map((e) => {
              const issued = issuedByEvent.get(e.id) ?? 0;
              const pct = e.ticket_quota > 0 ? Math.min(100, Math.round((issued / e.ticket_quota) * 100)) : 0;
              return (
                <Link
                  key={e.id}
                  href={`/dashboard/events/${e.id}`}
                  className="group rounded-2xl border border-zinc-200 bg-white p-5 transition-colors hover:border-emerald-300"
                >
                  <div className="flex items-start justify-between">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                      <CalendarRange className="h-5 w-5" />
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        e.status === "active"
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-zinc-200 text-zinc-600"
                      }`}
                    >
                      {e.status}
                    </span>
                  </div>
                  <p className="mt-4 font-semibold text-zinc-900 group-hover:text-emerald-700">
                    {e.name}
                  </p>
                  <p className="mt-0.5 font-mono text-xs text-zinc-400">/e/{e.slug}</p>

                  <div className="mt-4">
                    <div className="flex items-center justify-between text-xs text-zinc-500">
                      <span>
                        {issued} / {e.ticket_quota} issued
                      </span>
                      <span>{pct}%</span>
                    </div>
                    <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-zinc-100">
                      <div
                        className="h-full rounded-full bg-emerald-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      ))}

      {grouped.size === 0 && (
        <div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-10 text-center text-sm text-zinc-400">
          No events yet. Ask the platform admin to create one for you.
        </div>
      )}
    </div>
  );
}
