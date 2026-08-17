import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Gauge, ScanLine, Ticket } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { closeEvent, reopenEvent } from "@/app/admin/actions";
import { StatCard } from "@/components/dashboard/stat-card";

export default async function EventDetail({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const supabase = await createClient();

  const { data: event } = await supabase.from("events").select("*, accounts(name)").eq("id", eventId).maybeSingle();
  if (!event) notFound();

  const { count: issuedCount } = await supabase
    .from("tickets")
    .select("id", { count: "exact", head: true })
    .eq("event_id", eventId);

  const { count: checkedInCount } = await supabase
    .from("tickets")
    .select("id", { count: "exact", head: true })
    .eq("event_id", eventId)
    .eq("status", "checked_in");

  const toggle = async () => {
    "use server";
    if (event!.status === "active") {
      await closeEvent(eventId);
    } else {
      await reopenEvent(eventId);
    }
  };

  const accountName = (event as unknown as { accounts: { name: string } | null }).accounts?.name;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <Link
          href={`/admin/accounts/${event.account_id}`}
          className="mb-2 inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900"
        >
          <ChevronLeft className="h-4 w-4" />
          {accountName ?? "Account"}
        </Link>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">{event.name}</h1>
            <p className="mt-1 font-mono text-xs text-zinc-500">/e/{event.slug}</p>
          </div>
          <form action={toggle}>
            <button
              className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                event.status === "active"
                  ? "bg-red-50 text-red-700 hover:bg-red-100"
                  : "bg-orange-50 text-orange-700 hover:bg-orange-100"
              }`}
            >
              {event.status === "active" ? "Close event" : "Reopen event"}
            </button>
          </form>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard icon={Gauge} label="Quota" value={event.ticket_quota} color="zinc" />
        <StatCard icon={Ticket} label="Issued" value={issuedCount ?? 0} color="orange" />
        <StatCard icon={ScanLine} label="Checked in" value={checkedInCount ?? 0} color="blue" />
      </div>
    </div>
  );
}
