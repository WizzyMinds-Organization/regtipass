"use client";

import { useState } from "react";
import { KeyRound, TriangleAlert, X } from "lucide-react";
import { resetStaffPassword } from "./actions";
import { PasswordInput } from "@/components/password-input";

export function ResetPasswordButton({
  eventId,
  accountUserId,
  email,
}: {
  eventId: string;
  accountUserId: string;
  email: string;
}) {
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const matches = confirmText.trim().toLowerCase() === email.trim().toLowerCase();

  const close = () => {
    setOpen(false);
    setConfirmText("");
    setPassword("");
    setDone(false);
    setError(null);
  };

  const confirmReset = async () => {
    if (!matches || password.length < 8) return;
    setPending(true);
    const res = await resetStaffPassword(eventId, accountUserId, password);
    setPending(false);
    if (res.error) setError(res.error);
    else setDone(true);
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-md p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-900"
        title="Reset password"
      >
        <KeyRound className="h-4 w-4" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30" onClick={close} aria-hidden />
          <div className="relative w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-5 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-zinc-900">Reset staff password</h2>
              <button
                onClick={close}
                className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {done ? (
              <div className="mt-4 flex flex-col gap-3">
                <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                  Password updated for {email}.
                </div>
                <button
                  onClick={close}
                  className="self-start rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
                >
                  Done
                </button>
              </div>
            ) : (
              <div className="mt-4 flex flex-col gap-3">
                <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                  <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>
                    This immediately invalidates their current password. To prevent accidental resets, type
                    their email to confirm.
                  </span>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-zinc-600">
                    Type <span className="font-semibold text-zinc-900">{email}</span> to confirm
                  </label>
                  <input
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    autoComplete="off"
                    className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-orange-500"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-zinc-600">New password</label>
                  <PasswordInput
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    minLength={8}
                    autoComplete="new-password"
                  />
                </div>

                {error && <p className="text-sm text-red-600">{error}</p>}

                <button
                  onClick={confirmReset}
                  disabled={!matches || password.length < 8 || pending}
                  className="self-start rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-zinc-300"
                >
                  {pending ? "Resetting..." : "Reset password"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
