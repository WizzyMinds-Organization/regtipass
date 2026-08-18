import { notFound } from "next/navigation";
import { getEventContext } from "@/lib/event-context";
import { PageHeader } from "@/components/dashboard/page-header";
import { CheckinTabs } from "./checkin-tabs";

export default async function CheckinPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const ctx = await getEventContext(eventId);
  if (!ctx || !ctx.canCheckin) notFound();

  if (ctx.event.status !== "active") {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Check-in" />
        <p className="text-zinc-500">This event is closed — check-in is disabled.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Check-in" compact />
      <CheckinTabs eventId={eventId} />
    </div>
  );
}
