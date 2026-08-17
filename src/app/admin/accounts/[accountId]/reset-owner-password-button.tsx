"use client";

import { useState } from "react";
import { KeyRound, TriangleAlert, X } from "lucide-react";
import { resetOwnerPassword } from "@/app/admin/actions";

export function ResetOwnerPasswordButton({ accountId, ownerEmail }: { accountId: string; ownerEmail: string }) {
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<{ error: string | null; password?: string; email?: string } | null>(null);

  const matches = confirmText.trim().toLowerCase() === ownerEmail.trim().toLowerCase();

  const close = () => {
    setOpen(false);
    setConfirmText("");
    setResult(null);
  };

  const confirmReset = async () => {
    if (!matches) return;
    setPending(true);
    const res = await resetOwnerPassword(accountId);
    setPending(false);
    setResult(res);
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-100 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-200"
      >
        <KeyRound className="h-4 w-4" />
        Reset owner password
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30" onClick={close} aria-hidden />
          <div className="relative w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-5 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-zinc-900">Reset owner password</h2>
              <button
                onClick={close}
                className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {result?.password ? (
              <div className="mt-4 flex flex-col gap-3">
                <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                  New password set. Share these credentials (shown once):
                  <div className="mt-1 break-all font-mono text-xs">
                    {result.email} / {result.password}
                  </div>
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
                    This immediately invalidates the owner&apos;s current password. To prevent accidental resets,
                    type their email to confirm.
                  </span>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-zinc-600">
                    Type <span className="font-semibold text-zinc-900">{ownerEmail}</span> to confirm
                  </label>
                  <input
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    autoComplete="off"
                    className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-orange-500"
                  />
                </div>

                {result?.error && <p className="text-sm text-red-600">{result.error}</p>}

                <button
                  onClick={confirmReset}
                  disabled={!matches || pending}
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
