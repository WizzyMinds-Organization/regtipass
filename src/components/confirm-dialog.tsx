"use client";

import { useState } from "react";
import { TriangleAlert, X } from "lucide-react";

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  danger = true,
  pending = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
  pending?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="absolute inset-0 bg-black/30" onClick={onCancel} aria-hidden />
      <div className="relative w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-5 shadow-xl">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-900">{title}</h2>
          <button onClick={onCancel} className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{message}</span>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button
            onClick={onCancel}
            disabled={pending}
            className="rounded-md px-3 py-1.5 text-sm font-medium text-zinc-600 hover:bg-zinc-100 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={pending}
            className={`rounded-md px-3 py-1.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-zinc-300 ${
              danger ? "bg-red-600 hover:bg-red-700" : "bg-orange-600 hover:bg-orange-700"
            }`}
          >
            {pending ? "Working..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Local state helper so callers don't need to hand-roll open/pending state. */
export function useConfirmDialog() {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);

  return {
    open,
    pending,
    show: () => setOpen(true),
    hide: () => {
      setOpen(false);
      setPending(false);
    },
    setPending,
  };
}
