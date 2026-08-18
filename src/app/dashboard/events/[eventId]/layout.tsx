import { notFound } from "next/navigation";
import { getEventContext } from "@/lib/event-context";
import { EventNavSetter } from "@/components/dashboard/event-nav-setter";
import { TrackLastEvent } from "@/components/dashboard/track-last-event";

export default async function EventLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const ctx = await getEventContext(eventId);
  if (!ctx) notFound();

  const { event, isOwner, canManageParticipants, canCheckin } = ctx;

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <TrackLastEvent eventId={eventId} />
      <EventNavSetter
        eventId={eventId}
        eventName={event.name}
        eventStatus={event.status}
        isOwner={isOwner}
        canCheckin={canCheckin}
        canManageParticipants={canManageParticipants}
      />

      {event.status === "closed" && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          This event is closed. Everything below is read-only.
        </div>
      )}

      {children}
    </div>
  );
}
