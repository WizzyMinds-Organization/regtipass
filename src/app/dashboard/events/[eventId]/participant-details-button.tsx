"use client";

import { useState } from "react";
import { Eye, X } from "lucide-react";
import type { FormField } from "@/lib/supabase/types";

export function ParticipantDetailsButton({
  ticketId,
  fields,
  data,
}: {
  ticketId: string;
  fields: FormField[];
  data: Record<string, string>;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-md p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-900"
        title="View participant details"
      >
        <Eye className="h-4 w-4" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30" onClick={() => setOpen(false)} aria-hidden />
          <div className="relative w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-5 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-zinc-900">Participant details</h2>
              <button
                onClick={() => setOpen(false)}
                className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 flex flex-col divide-y divide-zinc-100">
              <div className="flex items-center justify-between py-2 text-sm">
                <span className="text-zinc-500">Ticket ID</span>
                <span className="font-mono text-xs text-zinc-900">{ticketId}</span>
              </div>
              {fields.map((f) => (
                <div key={f.id} className="flex items-center justify-between gap-4 py-2 text-sm">
                  <span className="shrink-0 text-zinc-500">{f.label}</span>
                  <span className="truncate text-zinc-900">{data[f.key] || "—"}</span>
                </div>
              ))}
              {fields.length === 0 && (
                <p className="py-2 text-sm text-zinc-400">No participant fields were configured.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
