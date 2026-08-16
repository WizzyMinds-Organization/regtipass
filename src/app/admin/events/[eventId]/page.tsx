import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { closeEvent, reopenEvent } from "@/app/admin/actions";

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
        <Link href={`/admin/accounts/${event.account_id}`} className="text-sm text-zinc-500 hover:underline">
          ← {accountName ?? "Account"}
        </Link>
        <div className="mt-2 flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-zinc-900">{event.name}</h1>
          <form action={toggle}>
            <button
              className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                event.status === "active"
                  ? "bg-red-50 text-red-700 hover:bg-red-100"
                  : "bg-green-50 text-green-700 hover:bg-green-100"
              }`}
            >
              {event.status === "active" ? "Close event" : "Reopen event"}
            </button>
          </form>
        </div>
        <p className="mt-1 font-mono text-xs text-zinc-500">/e/{event.slug}</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Stat label="Quota" value={event.ticket_quota} />
        <Stat label="Issued" value={issuedCount ?? 0} />
        <Stat label="Checked in" value={checkedInCount ?? 0} />
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
