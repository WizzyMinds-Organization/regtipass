import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getEventContext } from "@/lib/event-context";
import { PageHeader } from "@/components/dashboard/page-header";
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
      <PageHeader
        title="Staff management"
        subtitle="Manager: edit forms/templates, issue, check in. Issuer: issue tickets, check in. Check-in Staff: check in only, no ticket IDs."
        action={<InviteStaffForm eventId={eventId} />}
      />

      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
        <div className="overflow-x-auto">
        <table className="w-full min-w-[480px] text-sm">
          <thead className="bg-zinc-50 text-left text-zinc-500">
            <tr>
              <th className="px-4 py-2 font-medium">Name</th>
              <th className="px-4 py-2 font-medium">Email</th>
              <th className="px-4 py-2 font-medium">Role</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {staff.map((m) => (
              <StaffRow
                key={m.id}
                eventId={eventId}
                accountUserId={m.id}
                name={m.name}
                email={emailById.get(m.user_id) ?? m.user_id}
                role={m.role ?? "issuer"}
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
    </div>
  );
}
