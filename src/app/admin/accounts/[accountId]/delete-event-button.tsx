"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, TriangleAlert, X } from "lucide-react";
import { deleteEvent } from "@/app/admin/actions";

export function DeleteEventButton({ eventId, eventName }: { eventId: string; eventName: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const matches = confirmText.trim() === eventName.trim();

  const close = () => {
    setOpen(false);
    setConfirmText("");
    setError(null);
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-zinc-400 hover:text-red-600"
        title="Delete event"
      >
        <Trash2 className="h-4 w-4" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30" onClick={close} aria-hidden />
          <div className="relative w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-5 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-zinc-900">Delete event</h2>
              <button
                onClick={close}
                className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 flex flex-col gap-3">
              <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-900">
                <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  This permanently deletes the event and all its tickets, templates, and form fields. This
                  cannot be undone. Type the event name to confirm.
                </span>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-zinc-600">
                  Type <span className="font-semibold text-zinc-900">{eventName}</span> to confirm
                </label>
                <input
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  autoComplete="off"
                  className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-red-500"
                />
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}

              <button
                onClick={async () => {
                  if (!matches) return;
                  setDeleting(true);
                  const res = await deleteEvent(eventId);
                  setDeleting(false);
                  if (res.error) {
                    setError(res.error);
                    return;
                  }
                  router.refresh();
                  close();
                }}
                disabled={!matches || deleting}
                className="self-start rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-zinc-300"
              >
                {deleting ? "Deleting..." : "Delete event"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
