import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getEventContext } from "@/lib/event-context";
import { InviteStaffForm } from "./invite-form";
import { StaffRow } from "./staff-row";

export default async function StaffPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const ctx = await getEventContext(eventId);
  if (!ctx || !ctx.isOwner) notFound();

  const admin = createAdminClient();
  const { data: members } = await admin
    .from("account_users")
    .select("*")
    .eq("account_id", ctx.event.account_id)
    .order("created_at");

  const staff = (members ?? []).filter((m) => !m.is_owner);

  const emailById = new Map<string, string>();
  if (staff.length > 0) {
    const { data: directoryRows } = await admin
      .from("user_directory")
      .select("user_id, email")
      .in("user_id", staff.map((m) => m.user_id));
    for (const row of directoryRows ?? []) emailById.set(row.user_id, row.email);
  }

  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-zinc-500">
        Check-in staff can only scan and view live counts. Participant staff can add participants
        and issue tickets. Grant either or both.
      </p>

      <InviteStaffForm eventId={eventId} />

      <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-left text-zinc-500">
            <tr>
              <th className="px-4 py-2 font-medium">Email</th>
              <th className="px-4 py-2 font-medium">Check-in</th>
              <th className="px-4 py-2 font-medium">Participants</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {staff.map((m) => (
              <StaffRow
                key={m.id}
                eventId={eventId}
                accountUserId={m.id}
                email={emailById.get(m.user_id) ?? m.user_id}
                canCheckin={m.can_checkin}
                canManageParticipants={m.can_manage_participants}
              />
            ))}
            {staff.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-zinc-400">
                  No staff invited yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
