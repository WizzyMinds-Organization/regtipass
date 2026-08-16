"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { BrowserQRCodeReader, IScannerControls } from "@zxing/browser";

type CheckinResult = {
  result: "success" | "already_checked_in" | "invalid";
  ticket_id: string;
  status: string | null;
  checked_in_at: string | null;
  participant_data: Record<string, string> | null;
};

export function CheckinScanner({ eventId }: { eventId: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const lastScanRef = useRef<{ id: string; at: number }>({ id: "", at: 0 });
  const [manualId, setManualId] = useState("");
  const [lastResult, setLastResult] = useState<CheckinResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [counts, setCounts] = useState<{ issued: number; checkedIn: number } | null>(null);

  const submit = useCallback(async (ticketId: string) => {
    const now = Date.now();
    if (lastScanRef.current.id === ticketId && now - lastScanRef.current.at < 4000) return;
    lastScanRef.current = { id: ticketId, at: now };

    try {
      const res = await fetch("/api/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticketId }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Check-in failed.");
        return;
      }
      setError(null);
      setLastResult(json);
      refreshCounts();
    } catch {
      setError("Network error.");
    }
  }, []);

  const refreshCounts = useCallback(async () => {
    const res = await fetch(`/api/events/${eventId}/counts`);
    if (res.ok) setCounts(await res.json());
  }, [eventId]);

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
        submit(result.getText());
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
  }, [submit]);

  return (
    <div className="grid gap-6 sm:grid-cols-2">
      <div className="flex flex-col gap-3">
        <div className="overflow-hidden rounded-lg border border-zinc-200 bg-black">
          <video ref={videoRef} className="aspect-square w-full object-cover" muted playsInline />
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (manualId.trim()) submit(manualId.trim());
            setManualId("");
          }}
          className="flex gap-2"
        >
          <input
            value={manualId}
            onChange={(e) => setManualId(e.target.value)}
            placeholder="Type ticket ID"
            className="flex-1 rounded-md border border-zinc-300 px-3 py-2 text-sm font-mono"
          />
          <button className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700">
            Check in
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

        {lastResult && (
          <div
            className={`rounded-lg border p-4 ${
              lastResult.result === "success"
                ? "border-green-200 bg-green-50"
                : lastResult.result === "already_checked_in"
                ? "border-amber-200 bg-amber-50"
                : "border-red-200 bg-red-50"
            }`}
          >
            <p className="text-sm font-semibold">
              {lastResult.result === "success" && "✓ Checked in"}
              {lastResult.result === "already_checked_in" &&
                `Already checked in${
                  lastResult.checked_in_at
                    ? ` at ${new Date(lastResult.checked_in_at).toLocaleTimeString()}`
                    : ""
                }`}
              {lastResult.result === "invalid" && "Invalid ticket"}
            </p>
            <p className="mt-1 font-mono text-xs text-zinc-500">{lastResult.ticket_id}</p>
            {lastResult.participant_data?.name && (
              <p className="mt-1 text-sm text-zinc-700">{lastResult.participant_data.name}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
