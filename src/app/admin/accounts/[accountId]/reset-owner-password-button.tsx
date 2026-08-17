"use client";

import { useState } from "react";
import { KeyRound, X } from "lucide-react";
import { resetOwnerPassword } from "@/app/admin/actions";

export function ResetOwnerPasswordButton({ accountId }: { accountId: string }) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<{ error: string | null; password?: string; email?: string } | null>(null);

  const start = async () => {
    setOpen(true);
    setPending(true);
    setResult(null);
    const res = await resetOwnerPassword(accountId);
    setPending(false);
    setResult(res);
  };

  return (
    <>
      <button
        onClick={start}
        className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-100 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-200"
      >
        <KeyRound className="h-3.5 w-3.5" />
        Reset owner password
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30" onClick={() => setOpen(false)} aria-hidden />
          <div className="relative w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-5 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-zinc-900">Reset owner password</h2>
              <button
                onClick={() => setOpen(false)}
                className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4">
              {pending && <p className="text-sm text-zinc-500">Resetting...</p>}
              {result?.error && <p className="text-sm text-red-600">{result.error}</p>}
              {result?.password && (
                <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                  New password set. Share these credentials (shown once):
                  <div className="mt-1 break-all font-mono text-xs">
                    {result.email} / {result.password}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
