import { notFound } from "next/navigation";
import Link from "next/link";
import { Banknote, HandCoins, Plus, Ticket, Wallet } from "lucide-react";
import { getEventContext } from "@/lib/event-context";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/dashboard/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { HandoverForm } from "./handover-form";
import { HandoverRow } from "./handover-row";

export default async function SalesPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const ctx = await getEventContext(eventId);
  if (!ctx || !ctx.canManageParticipants) notFound();

  const user = await getCurrentUser();
  const supabase = await createClient();
  const admin = createAdminClient();

  const [{ data: tickets }, { data: handovers }, { data: members }] = await Promise.all([
    supabase.from("tickets").select("issued_by, amount_collected").eq("event_id", eventId),
    supabase
      .from("cash_handovers")
      .select("*")
      .eq("event_id", eventId)
      .order("created_at", { ascending: false }),
    admin
      .from("account_users")
      .select("user_id, is_owner, can_manage_participants")
      .eq("account_id", ctx.event.account_id),
  ]);

  const sellers = ctx.isOwner
    ? (members ?? []).filter((m) => m.is_owner || m.can_manage_participants)
    : (members ?? []).filter((m) => m.user_id === user?.id);

  const staffIds = sellers.map((m) => m.user_id);
  const emailById = new Map<string, string>();
  if (staffIds.length > 0) {
    const { data: directoryRows } = await admin
      .from("user_directory")
      .select("user_id, email")
      .in("user_id", staffIds);
    for (const row of directoryRows ?? []) emailById.set(row.user_id, row.email);
  }

  const soldByStaff = new Map<string, { count: number; amount: number }>();
  for (const t of tickets ?? []) {
    if (!t.issued_by) continue;
    const cur = soldByStaff.get(t.issued_by) ?? { count: 0, amount: 0 };
    cur.count += 1;
    cur.amount += Number(t.amount_collected);
    soldByStaff.set(t.issued_by, cur);
  }

  const handedOverByStaff = new Map<string, number>();
  for (const h of handovers ?? []) {
    handedOverByStaff.set(h.staff_user_id, (handedOverByStaff.get(h.staff_user_id) ?? 0) + Number(h.amount));
  }

  const rows = sellers
    .map((m) => {
      const sold = soldByStaff.get(m.user_id) ?? { count: 0, amount: 0 };
      const handedOver = handedOverByStaff.get(m.user_id) ?? 0;
      return {
        userId: m.user_id,
        email: emailById.get(m.user_id) ?? m.user_id,
        soldCount: sold.count,
        soldAmount: sold.amount,
        handedOver,
        balance: sold.amount - handedOver,
      };
    })
    .sort((a, b) => b.soldAmount - a.soldAmount);

  const totalSold = rows.reduce((sum, r) => sum + r.soldAmount, 0);
  const totalHandedOver = rows.reduce((sum, r) => sum + r.handedOver, 0);
  const totalTickets = rows.reduce((sum, r) => sum + r.soldCount, 0);

  const editable = ctx.event.status === "active";

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Ticket sales"
        subtitle={
          ctx.isOwner
            ? "See who sold what and reconcile cash handed over to you, finance, or vendors."
            : "Your ticket sales and the cash you've handed over so far."
        }
        action={
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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard icon={Ticket} label={ctx.isOwner ? "Tickets sold" : "Your tickets sold"} value={totalTickets} color="orange" />
        <StatCard icon={Wallet} label={ctx.isOwner ? "Total collected" : "You collected"} value={totalSold.toFixed(2)} color="blue" />
        <StatCard icon={HandCoins} label={ctx.isOwner ? "Total handed over" : "You handed over"} value={totalHandedOver.toFixed(2)} color="amber" />
      </div>

      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
        <div className="border-b border-zinc-200 px-5 py-4">
          <h3 className="text-sm font-semibold text-zinc-900">
            {ctx.isOwner ? "By staff member" : "Your balance"}
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead className="bg-zinc-50 text-left text-zinc-500">
              <tr>
                <th className="px-5 py-2.5 font-medium">Staff</th>
                <th className="px-5 py-2.5 font-medium">Tickets sold</th>
                <th className="px-5 py-2.5 font-medium">Collected</th>
                <th className="px-5 py-2.5 font-medium">Handed over</th>
                <th className="px-5 py-2.5 font-medium">Balance</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.userId} className="border-t border-zinc-100">
                  <td className="px-5 py-2.5 text-zinc-900">{r.email}</td>
                  <td className="px-5 py-2.5 text-zinc-600">{r.soldCount}</td>
                  <td className="px-5 py-2.5 text-zinc-600">{r.soldAmount.toFixed(2)}</td>
                  <td className="px-5 py-2.5 text-zinc-600">{r.handedOver.toFixed(2)}</td>
                  <td className="px-5 py-2.5">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        r.balance > 0
                          ? "bg-amber-100 text-amber-700"
                          : "bg-orange-100 text-orange-700"
                      }`}
                    >
                      {r.balance.toFixed(2)}
                    </span>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-zinc-400">
                    No sales activity yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
        <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-4">
          <h3 className="text-sm font-semibold text-zinc-900">
            <Banknote className="mr-1.5 inline h-4 w-4 text-zinc-400" />
            Handover log
          </h3>
          {editable && (
            <HandoverForm
              eventId={eventId}
              isOwner={ctx.isOwner}
              staffOptions={sellers.map((m) => ({ userId: m.user_id, email: emailById.get(m.user_id) ?? m.user_id }))}
            />
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] text-sm">
            <thead className="bg-zinc-50 text-left text-zinc-500">
              <tr>
                <th className="px-5 py-2.5 font-medium">Date</th>
                <th className="px-5 py-2.5 font-medium">Staff</th>
                <th className="px-5 py-2.5 font-medium">Amount</th>
                <th className="px-5 py-2.5 font-medium">Given to</th>
                <th className="px-5 py-2.5 font-medium">Note</th>
                {ctx.isOwner && <th className="px-5 py-2.5"></th>}
              </tr>
            </thead>
            <tbody>
              {(handovers ?? []).map((h) => (
                <HandoverRow
                  key={h.id}
                  eventId={eventId}
                  handover={h}
                  email={emailById.get(h.staff_user_id) ?? h.staff_user_id}
                  canDelete={ctx.isOwner}
                />
              ))}
              {(handovers ?? []).length === 0 && (
                <tr>
                  <td colSpan={ctx.isOwner ? 6 : 5} className="px-5 py-10 text-center text-zinc-400">
                    No handovers recorded yet.
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
