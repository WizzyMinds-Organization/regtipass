"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { recordHandover } from "./actions";

export function HandoverForm({
  eventId,
  isOwner,
  staffOptions,
}: {
  eventId: string;
  isOwner: boolean;
  staffOptions: { userId: string; email: string }[];
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const res = await recordHandover(eventId, new FormData(e.currentTarget));
    setPending(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    formRef.current?.reset();
    router.refresh();
  }

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5">
      <h2 className="text-sm font-semibold text-zinc-900">Record a handover</h2>
      <p className="mt-1 text-xs text-zinc-500">
        Log cash you've handed to the organizer, finance, or a vendor. Optional — use it if it helps you keep track.
      </p>
      <form ref={formRef} onSubmit={onSubmit} className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:items-end">
        {isOwner && (
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-zinc-600">Staff member</label>
            <select
              name="staff_user_id"
              className="rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-emerald-500"
            >
              {staffOptions.map((s) => (
                <option key={s.userId} value={s.userId}>
                  {s.email}
                </option>
              ))}
            </select>
          </div>
        )}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-zinc-600">Amount</label>
          <input
            name="amount"
            type="number"
            min={0.01}
            step="0.01"
            required
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-emerald-500"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-zinc-600">Given to</label>
          <select
            name="recipient_type"
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-emerald-500"
          >
            <option value="organizer">Organizer</option>
            <option value="finance">Finance</option>
            <option value="vendor">Vendor</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-zinc-600">Recipient name (optional)</label>
          <input
            name="recipient_name"
            placeholder="e.g. catering vendor"
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-emerald-500"
          />
        </div>
        <div className="flex flex-col gap-1 sm:col-span-2 lg:col-span-3">
          <label className="text-xs font-medium text-zinc-600">Note (optional)</label>
          <input
            name="note"
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-emerald-500"
          />
        </div>
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {pending ? "Saving…" : "Record handover"}
        </button>
      </form>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
