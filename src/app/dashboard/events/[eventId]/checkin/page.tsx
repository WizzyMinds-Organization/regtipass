import { notFound } from "next/navigation";
import { getEventContext } from "@/lib/event-context";
import { CheckinScanner } from "./scanner";

export default async function CheckinPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const ctx = await getEventContext(eventId);
  if (!ctx || !ctx.canCheckin) notFound();

  if (ctx.event.status !== "active") {
    return <p className="text-zinc-500">This event is closed — check-in is disabled.</p>;
  }

  return <CheckinScanner eventId={eventId} />;
}
