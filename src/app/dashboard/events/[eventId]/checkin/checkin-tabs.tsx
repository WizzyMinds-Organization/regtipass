"use client";

import { useState } from "react";
import { CheckinScanner } from "./scanner";
import { CheckinGuestList } from "./checkin-guest-list";

const TABS = [
  { key: "scan", label: "Check-in" },
  { key: "checked_in", label: "Checked in" },
  { key: "pending", label: "Not checked in" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export function CheckinTabs({ eventId }: { eventId: string }) {
  const [tab, setTab] = useState<TabKey>("scan");

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-1 border-b border-zinc-200">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`border-b-2 px-3 py-2 text-sm font-medium ${
              tab === t.key ? "border-orange-600 text-orange-700" : "border-transparent text-zinc-500 hover:text-zinc-900"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "scan" && <CheckinScanner eventId={eventId} />}
      {tab === "checked_in" && <CheckinGuestList eventId={eventId} filter="checked_in" />}
      {tab === "pending" && <CheckinGuestList eventId={eventId} filter="pending" />}
    </div>
  );
}
