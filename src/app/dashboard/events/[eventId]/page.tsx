import { notFound } from "next/navigation";
import { getEventContext } from "@/lib/event-context";
import { createClient } from "@/lib/supabase/server";

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
      <div className="grid grid-cols-3 gap-4">
        <Stat label="Issued" value={issued ?? 0} />
        <Stat label="Checked in" value={checkedIn ?? 0} />
        <Stat label="Remaining quota" value={remaining} />
      </div>

      <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-left text-zinc-500">
            <tr>
              <th className="px-4 py-2 font-medium">Ticket ID</th>
              <th className="px-4 py-2 font-medium">Participant</th>
              <th className="px-4 py-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {(tickets ?? []).map((t) => (
              <tr key={t.id} className="border-t border-zinc-100">
                <td className="px-4 py-2 font-mono text-xs text-zinc-500">{t.id}</td>
                <td className="px-4 py-2 text-zinc-900">
                  {(t.participant_data as Record<string, string>)?.name ?? "—"}
                </td>
                <td className="px-4 py-2">
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
                <td colSpan={3} className="px-4 py-8 text-center text-zinc-400">
                  No tickets issued yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4">
      <div className="text-xs font-medium text-zinc-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-zinc-900">{value}</div>
    </div>
  );
}
