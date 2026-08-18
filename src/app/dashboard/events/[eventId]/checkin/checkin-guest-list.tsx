"use client";

import { useEffect, useState } from "react";

type Guest = { id?: string; name: string; status: "issued" | "checked_in" };
type Status = { issued: number; checkedIn: number; guests: Guest[] };

export function CheckinGuestList({
  eventId,
  filter,
}: {
  eventId: string;
  filter: "checked_in" | "pending";
}) {
  const [data, setData] = useState<Status | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const res = await fetch(`/api/events/${eventId}/checkin-status`);
      if (res.ok && !cancelled) setData(await res.json());
    }
    load();
    const interval = setInterval(load, 5000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [eventId]);

  const guests = (data?.guests ?? []).filter((g) =>
    filter === "checked_in" ? g.status === "checked_in" : g.status !== "checked_in"
  );
  const hasTicketId = guests.some((g) => g.id);
  const count = filter === "checked_in" ? data?.checkedIn ?? 0 : (data ? data.issued - data.checkedIn : 0);
  const emptyLabel = !data || data.issued === 0
    ? "No tickets issued yet."
    : filter === "checked_in"
    ? "No one has checked in yet."
    : "Everyone has checked in.";

  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 px-5 py-4">
        <h3 className="text-sm font-semibold text-zinc-900">
          {filter === "checked_in" ? "Checked in" : "Not checked in"}
        </h3>
        {data && <span className="text-sm text-zinc-500">{count} guests</span>}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[320px] text-sm">
          <thead className="bg-zinc-50 text-left text-zinc-500">
            <tr>
              {hasTicketId && <th className="px-5 py-2.5 font-medium">Ticket ID</th>}
              <th className="px-5 py-2.5 font-medium">Participant</th>
            </tr>
          </thead>
          <tbody>
            {guests.map((g, i) => (
              <tr key={g.id ?? i} className="border-t border-zinc-100">
                {hasTicketId && <td className="px-5 py-2.5 font-mono text-xs text-zinc-500">{g.id}</td>}
                <td className="px-5 py-2.5 text-zinc-900">{g.name}</td>
              </tr>
            ))}
            {data && guests.length === 0 && (
              <tr>
                <td colSpan={hasTicketId ? 2 : 1} className="px-5 py-10 text-center text-zinc-400">
                  {emptyLabel}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
