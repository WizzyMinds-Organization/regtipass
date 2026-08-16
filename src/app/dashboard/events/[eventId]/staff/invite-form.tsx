"use client";

import { useActionState } from "react";
import { inviteStaff } from "./actions";

export function InviteStaffForm({ eventId }: { eventId: string }) {
  const action = inviteStaff.bind(null, eventId);
  const initialState: Awaited<ReturnType<typeof action>> = {
    error: null,
    password: undefined,
    email: undefined,
  };
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5">
      <h2 className="text-sm font-semibold text-zinc-900">Invite staff</h2>
      <form action={formAction} className="mt-3 flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-zinc-600">Email</label>
          <input
            name="email"
            type="email"
            required
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm"
          />
        </div>
        <div className="flex gap-4">
          <label className="flex items-center gap-2 text-sm text-zinc-700">
            <input name="can_checkin" type="checkbox" /> Check-in staff
          </label>
          <label className="flex items-center gap-2 text-sm text-zinc-700">
            <input name="can_manage_participants" type="checkbox" /> Participant staff
          </label>
        </div>

        {state.error && <p className="text-sm text-red-600">{state.error}</p>}
        {state.password && (
          <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            Staff account created. Share these credentials (shown once):
            <div className="mt-1 break-all font-mono text-xs">
              {state.email} / {state.password}
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={pending}
          className="self-start rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {pending ? "Inviting..." : "Invite"}
        </button>
      </form>
    </div>
  );
}
