import { notFound } from "next/navigation";
import { getEventContext } from "@/lib/event-context";
import { createClient } from "@/lib/supabase/server";
import { IssueForm } from "./issue-form";

export default async function IssuePage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const ctx = await getEventContext(eventId);
  if (!ctx || !ctx.canManageParticipants) notFound();

  const supabase = await createClient();
  const [{ data: fields }, { data: templates }, { count: issued }] = await Promise.all([
    supabase.from("form_fields").select("*").eq("event_id", eventId).order("sort_order"),
    supabase.from("templates").select("*").eq("event_id", eventId).order("created_at"),
    supabase.from("tickets").select("id", { count: "exact", head: true }).eq("event_id", eventId),
  ]);

  const remaining = ctx.event.ticket_quota - (issued ?? 0);

  if (ctx.event.status !== "active") {
    return <p className="text-zinc-500">This event is closed — ticket issuance is disabled.</p>;
  }

  if ((templates ?? []).length === 0) {
    return (
      <p className="text-zinc-500">
        No ticket templates yet. An account owner needs to design one first.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-zinc-500">
        {remaining} of {ctx.event.ticket_quota} tickets remaining.
      </p>
      <IssueForm eventId={eventId} fields={fields ?? []} templates={templates ?? []} remaining={remaining} />
    </div>
  );
}
