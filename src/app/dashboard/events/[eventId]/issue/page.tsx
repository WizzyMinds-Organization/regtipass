import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getEventContext } from "@/lib/event-context";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/dashboard/page-header";
import { IssueForm } from "./issue-form";

function BackLink({ eventId, isOwner }: { eventId: string; isOwner: boolean }) {
  return (
    <Link
      href={isOwner ? `/dashboard/events/${eventId}/sales` : `/dashboard/events/${eventId}`}
      className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900"
    >
      <ChevronLeft className="h-4 w-4" />
      {isOwner ? "Finance overview" : "Overview"}
    </Link>
  );
}

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
    return (
      <div className="flex flex-col gap-6">
        <BackLink eventId={eventId} isOwner={ctx.isOwner} />
        <PageHeader title="Issue tickets" />
        <p className="text-zinc-500">This event is closed — ticket issuance is disabled.</p>
      </div>
    );
  }

  if ((templates ?? []).length === 0) {
    return (
      <div className="flex flex-col gap-6">
        <BackLink eventId={eventId} isOwner={ctx.isOwner} />
        <PageHeader title="Issue tickets" />
        <p className="text-zinc-500">No ticket templates yet. An account owner needs to design one first.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <BackLink eventId={eventId} isOwner={ctx.isOwner} />
      <PageHeader
        title="Issue tickets"
        subtitle={`${remaining} of ${ctx.event.ticket_quota} tickets remaining.`}
      />
      <IssueForm eventId={eventId} fields={fields ?? []} templates={templates ?? []} remaining={remaining} />
    </div>
  );
}
