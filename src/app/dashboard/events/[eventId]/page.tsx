import { notFound } from "next/navigation";
import { Ticket, ScanLine, Gauge } from "lucide-react";
import { getEventContext } from "@/lib/event-context";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/dashboard/page-header";
import { StatCard } from "@/components/dashboard/stat-card";

export default async function EventOverview({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const ctx = await getEventContext(eventId);
  if (!ctx) notFound();

  const supabase = await createClient();
  const [{ count: issued }, { count: checkedIn }, { data: tickets }] = await Promise.all([
    supabase.from("tickets").select("id", { count: "exact", head: true }).eq("event_id", eventId),
    supabase
      .from("tickets")
      .select("id", { count: "exact", head: true })
      .eq("event_id", eventId)
      .eq("status", "checked_in"),
    supabase
      .from("tickets")
      .select("id, participant_data, status, checked_in_at")
      .eq("event_id", eventId)
      .order("created_at", { ascending: false })
      .limit(200),
  ]);

  const quota = ctx.event.ticket_quota;
  const remaining = quota - (issued ?? 0);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={ctx.event.name} subtitle="Live ticket counts and the full guest list." />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard icon={Ticket} label="Issued" value={issued ?? 0} color="emerald" />
        <StatCard icon={ScanLine} label="Checked in" value={checkedIn ?? 0} color="blue" />
        <StatCard icon={Gauge} label="Remaining quota" value={remaining} color="amber" />
      </div>

      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
        <div className="border-b border-zinc-200 px-5 py-4">
          <h3 className="text-sm font-semibold text-zinc-900">Guest list</h3>
        </div>
        <div className="overflow-x-auto">
        <table className="w-full min-w-[480px] text-sm">
          <thead className="bg-zinc-50 text-left text-zinc-500">
            <tr>
              <th className="px-5 py-2.5 font-medium">Ticket ID</th>
              <th className="px-5 py-2.5 font-medium">Participant</th>
              <th className="px-5 py-2.5 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {(tickets ?? []).map((t) => (
              <tr key={t.id} className="border-t border-zinc-100">
                <td className="px-5 py-2.5 font-mono text-xs text-zinc-500">{t.id}</td>
                <td className="px-5 py-2.5 text-zinc-900">
                  {(t.participant_data as Record<string, string>)?.name ?? "—"}
                </td>
                <td className="px-5 py-2.5">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      t.status === "checked_in"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-zinc-100 text-zinc-600"
                    }`}
                  >
                    {t.status === "checked_in" ? "Checked in" : "Issued"}
                  </span>
                </td>
              </tr>
            ))}
            {(tickets ?? []).length === 0 && (
              <tr>
                <td colSpan={3} className="px-5 py-10 text-center text-zinc-400">
                  No tickets issued yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}
