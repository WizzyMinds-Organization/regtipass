import Link from "next/link";
import { notFound } from "next/navigation";
import { getEventContext } from "@/lib/event-context";

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

  const tabs = [
    { href: `/dashboard/events/${eventId}`, label: "Overview", show: true },
    { href: `/dashboard/events/${eventId}/form`, label: "Form", show: isOwner },
    { href: `/dashboard/events/${eventId}/templates`, label: "Templates", show: isOwner },
    { href: `/dashboard/events/${eventId}/issue`, label: "Issue tickets", show: canManageParticipants },
    { href: `/dashboard/events/${eventId}/checkin`, label: "Check-in", show: canCheckin },
    { href: `/dashboard/events/${eventId}/staff`, label: "Staff", show: isOwner },
  ];

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <div>
        <Link href="/dashboard" className="text-sm text-zinc-500 hover:underline">
          ← All events
        </Link>
        <div className="mt-1 flex items-center gap-3">
          <h1 className="text-2xl font-semibold text-zinc-900">{event.name}</h1>
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
              event.status === "active" ? "bg-green-100 text-green-700" : "bg-zinc-200 text-zinc-600"
            }`}
          >
            {event.status}
          </span>
        </div>
        {event.status === "closed" && (
          <p className="mt-1 text-sm text-amber-700">
            This event is closed. Everything below is read-only.
          </p>
        )}
      </div>

      <nav className="flex gap-1 border-b border-zinc-200">
        {tabs
          .filter((t) => t.show)
          .map((t) => (
            <Link
              key={t.href}
              href={t.href}
              className="rounded-t-md px-3 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
            >
              {t.label}
            </Link>
          ))}
      </nav>

      {children}
    </div>
  );
}
