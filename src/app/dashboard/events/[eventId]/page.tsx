import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { Download, Plus, Ticket, ScanLine, Gauge, Wallet } from "lucide-react";
import { getEventContext } from "@/lib/event-context";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/dashboard/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { DeleteTicketButton } from "./delete-ticket-button";
import { ParticipantDetailsButton } from "./participant-details-button";

export default async function EventOverview({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const ctx = await getEventContext(eventId);
  if (!ctx) notFound();
  if (ctx.checkinOnly) redirect(`/dashboard/events/${eventId}/checkin`);

  const supabase = await createClient();
  const [{ data: fields }, { data: tickets }, { data: statsRow }] = await Promise.all([
    supabase.from("form_fields").select("*").eq("event_id", eventId).order("sort_order"),
    supabase
      .from("tickets")
      .select("id, participant_data, status, checked_in_at, issued_by, amount_collected")
      .eq("event_id", eventId)
      .order("created_at", { ascending: false })
      .limit(200),
    supabase.rpc("event_ticket_stats", { p_event_id: eventId }).single(),
  ]);

  const allFields = fields ?? [];
  const nameField =
    allFields.find((f) => /name/i.test(f.key) || /name/i.test(f.label)) ?? allFields[0] ?? null;

  const stats = statsRow as { issued: number; checked_in: number; total_collected: number } | null;
  const issued = stats?.issued ?? 0;
  const checkedIn = stats?.checked_in ?? 0;
  const totalCollected = Number(stats?.total_collected ?? 0);

  const sellerIds = [...new Set((tickets ?? []).map((t) => t.issued_by).filter((id): id is string => !!id))];
  const nameById = new Map<string, string>();
  if (sellerIds.length > 0) {
    const admin = createAdminClient();
    const [{ data: memberRows }, { data: directoryRows }] = await Promise.all([
      admin.from("account_users").select("user_id, name").eq("account_id", ctx.event.account_id).in("user_id", sellerIds),
      admin.from("user_directory").select("user_id, email").in("user_id", sellerIds),
    ]);
    for (const row of directoryRows ?? []) nameById.set(row.user_id, row.email);
    for (const row of memberRows ?? []) if (row.name) nameById.set(row.user_id, row.name);
  }

  const quota = ctx.event.ticket_quota;
  const remaining = quota - issued;
  const editable = ctx.event.status === "active";

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={ctx.event.name}
        subtitle="Live ticket counts and the full guest list."
        action={
          ctx.canManageParticipants &&
          editable && (
            <Link
              href={`/dashboard/events/${eventId}/issue`}
              className="inline-flex items-center gap-1.5 rounded-md bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700"
            >
              <Plus className="h-4 w-4" />
              Issue ticket
            </Link>
          )
        }
      />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard icon={Ticket} label="Issued" value={issued} color="orange" />
        <StatCard icon={ScanLine} label="Checked in" value={checkedIn} color="blue" />
        <StatCard icon={Gauge} label="Remaining quota" value={remaining} color="amber" />
        <StatCard icon={Wallet} label="Collected" value={totalCollected.toFixed(2)} color="zinc" />
      </div>

      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
        <div className="border-b border-zinc-200 px-5 py-4">
          <h3 className="text-sm font-semibold text-zinc-900">Guest list</h3>
        </div>
        <div className="overflow-x-auto">
        <table className="w-full min-w-[600px] text-sm">
          <thead className="bg-zinc-50 text-left text-zinc-500">
            <tr>
              <th className="px-5 py-2.5 font-medium">Ticket ID</th>
              <th className="px-5 py-2.5 font-medium">Participant</th>
              <th className="px-5 py-2.5 font-medium">Sold by</th>
              <th className="px-5 py-2.5 font-medium">Status</th>
              <th className="px-5 py-2.5"></th>
            </tr>
          </thead>
          <tbody>
            {(tickets ?? []).map((t) => {
              const data = (t.participant_data as Record<string, string>) ?? {};
              const participantName = (nameField && data[nameField.key]) || "—";
              return (
                <tr key={t.id} className="border-t border-zinc-100">
                  <td className="px-5 py-2.5 font-mono text-xs text-zinc-500">{t.id}</td>
                  <td className="px-5 py-2.5 text-zinc-900">{participantName}</td>
                  <td className="px-5 py-2.5 text-zinc-600">
                    {t.issued_by ? nameById.get(t.issued_by) ?? "—" : "—"}
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
                  <td className="px-5 py-2.5 text-right">
                    <div className="flex items-center justify-end gap-3">
                      <ParticipantDetailsButton ticketId={t.id} fields={allFields} data={data} />
                      <a
                        href={`/api/tickets/${t.id}/render?download=1`}
                        className="rounded-md p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-900"
                        title="Download ticket"
                      >
                        <Download className="h-4 w-4" />
                      </a>
                      {ctx.canManageParticipants && (
                        <DeleteTicketButton eventId={eventId} ticketId={t.id} participantName={participantName} />
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {(tickets ?? []).length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-10 text-center text-zinc-400">
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
