"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { BrowserQRCodeReader, IScannerControls } from "@zxing/browser";
import type { FormField } from "@/lib/supabase/types";

type Scanned = {
  ticketId: string;
  displayTicketId?: string;
  name: string;
  status: "issued" | "checked_in" | "invalid";
  confirmed: boolean;
};

function nameFieldFor(fields: FormField[]) {
  return fields.find((f) => /name/i.test(f.key) || /name/i.test(f.label)) ?? fields[0] ?? null;
}

export function CheckinScanner({ eventId, fields }: { eventId: string; fields: FormField[] }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const lastLookupRef = useRef<{ id: string; at: number }>({ id: "", at: 0 });
  const [manualId, setManualId] = useState("");
  const [scanned, setScanned] = useState<Scanned | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [counts, setCounts] = useState<{ issued: number; checkedIn: number } | null>(null);
  const [looking, setLooking] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const nameField = nameFieldFor(fields);

  const refreshCounts = useCallback(async () => {
    const res = await fetch(`/api/events/${eventId}/counts`);
    if (res.ok) setCounts(await res.json());
  }, [eventId]);

  const lookup = useCallback(
    async (ticketId: string) => {
      const now = Date.now();
      if (lastLookupRef.current.id === ticketId && now - lastLookupRef.current.at < 2000) return;
      lastLookupRef.current = { id: ticketId, at: now };

      setLooking(true);
      try {
        const res = await fetch(`/api/checkin?ticketId=${encodeURIComponent(ticketId)}&eventId=${eventId}`);
        const json = await res.json();
        if (!res.ok) {
          setError(json.error ?? "Lookup failed.");
          return;
        }
        setError(null);
        if (!json.found) {
          setScanned({ ticketId, name: "", status: "invalid", confirmed: false });
          return;
        }
        const data = (json.participant_data as Record<string, string> | null) ?? {};
        const name = (nameField && data[nameField.key]) || "—";
        setScanned({
          ticketId,
          displayTicketId: json.ticket_id,
          name,
          status: json.status,
          confirmed: false,
        });
      } catch {
        setError("Network error.");
      } finally {
        setLooking(false);
      }
    },
    [eventId, nameField]
  );

  const confirmCheckin = useCallback(async () => {
    if (!scanned) return;
    setConfirming(true);
    try {
      const res = await fetch("/api/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticketId: scanned.ticketId, eventId }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Check-in failed.");
        return;
      }
      setError(null);
      setScanned((prev) => (prev ? { ...prev, status: "checked_in", confirmed: json.result === "success" } : prev));
      refreshCounts();
    } catch {
      setError("Network error.");
    } finally {
      setConfirming(false);
    }
  }, [scanned, eventId, refreshCounts]);

  useEffect(() => {
    refreshCounts();
    const interval = setInterval(refreshCounts, 5000);
    return () => clearInterval(interval);
  }, [refreshCounts]);

  useEffect(() => {
    const reader = new BrowserQRCodeReader();
    let cancelled = false;

    reader
      .decodeFromVideoDevice(undefined, videoRef.current!, (result) => {
        if (cancelled || !result) return;
        lookup(result.getText());
      })
      .then((controls) => {
        if (cancelled) controls.stop();
        else controlsRef.current = controls;
      })
      .catch(() => setError("Could not access the camera. You can still check in manually below."));

    return () => {
      cancelled = true;
      controlsRef.current?.stop();
    };
  }, [lookup]);

  return (
    <div className="grid gap-6 sm:grid-cols-2">
      <div className="flex flex-col gap-3">
        <div className="overflow-hidden rounded-lg border border-zinc-200 bg-black">
          <video ref={videoRef} className="aspect-square w-full object-cover" muted playsInline />
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (manualId.trim()) lookup(manualId.trim());
            setManualId("");
          }}
          className="flex gap-2"
        >
          <input
            value={manualId}
            onChange={(e) => setManualId(e.target.value)}
            placeholder="Type ticket ID"
            disabled={looking}
            className="flex-1 rounded-md border border-zinc-300 px-3 py-2 text-sm font-mono disabled:bg-zinc-50"
          />
          <button
            disabled={looking}
            className="rounded-md bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700 disabled:opacity-50"
          >
            {looking ? "Looking up..." : "Find"}
          </button>
        </form>

        {counts && (
          <p className="text-sm text-zinc-500">
            {counts.checkedIn} checked in · {counts.issued - counts.checkedIn} remaining
          </p>
        )}
      </div>

      <div className="flex flex-col gap-3">
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {scanned && (
          <div
            className={`rounded-lg border-2 p-4 ${
              scanned.status === "invalid"
                ? "border-red-300 bg-red-50"
                : scanned.status === "checked_in"
                ? "border-red-300 bg-red-50"
                : "border-green-300 bg-green-50"
            }`}
          >
            {scanned.status === "invalid" && <p className="text-sm font-semibold text-red-700">Invalid ticket</p>}

            {scanned.status === "checked_in" && (
              <>
                <p className="text-sm font-semibold text-red-700">
                  {scanned.confirmed ? "✓ Checked in just now" : "Already checked in"}
                </p>
                <p className="mt-1 text-base font-medium text-zinc-900">{scanned.name}</p>
                {scanned.displayTicketId && (
                  <p className="mt-0.5 font-mono text-xs text-zinc-500">{scanned.displayTicketId}</p>
                )}
              </>
            )}

            {scanned.status === "issued" && (
              <>
                <p className="text-sm font-semibold text-green-700">Not checked in yet</p>
                <p className="mt-1 text-base font-medium text-zinc-900">{scanned.name}</p>
                {scanned.displayTicketId && (
                  <p className="mt-0.5 font-mono text-xs text-zinc-500">{scanned.displayTicketId}</p>
                )}
                <button
                  onClick={confirmCheckin}
                  disabled={confirming}
                  className="mt-3 w-full rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
                >
                  {confirming ? "Checking in..." : "Check in"}
                </button>
              </>
            )}
          </div>
        )}

        {!scanned && !error && (
          <p className="text-sm text-zinc-400">Scan a ticket QR code or enter an ID to look it up.</p>
        )}
      </div>
    </div>
  );
}
