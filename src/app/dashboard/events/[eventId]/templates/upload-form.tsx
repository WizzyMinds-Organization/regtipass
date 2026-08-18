"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Upload, X } from "lucide-react";

export function UploadTemplateForm({ eventId }: { eventId: string }) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);

    const form = e.currentTarget;
    const formData = new FormData(form);
    formData.set("event_id", eventId);

    const res = await fetch("/api/templates/upload", { method: "POST", body: formData });
    const json = await res.json();

    setPending(false);

    if (!res.ok) {
      setError(json.error ?? "Upload failed.");
      return;
    }

    router.push(`/dashboard/events/${eventId}/templates/${json.templateId}`);
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 self-start rounded-md bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700"
      >
        <Plus className="h-4 w-4" />
        New ticket template
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30" onClick={() => setOpen(false)} aria-hidden />
          <div className="relative w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-5 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-zinc-900">New ticket template</h2>
              <button
                onClick={() => setOpen(false)}
                className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={onSubmit} className="mt-4 flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-zinc-600">Template name</label>
                <input
                  name="name"
                  required
                  placeholder="e.g. VIP"
                  className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-orange-500"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-zinc-600">Price (optional)</label>
                <input
                  name="price"
                  type="number"
                  min={0}
                  step="0.01"
                  defaultValue={0}
                  className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-orange-500"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-zinc-600">Artwork (PNG/JPEG/WebP)</label>
                <input
                  ref={fileInputRef}
                  name="file"
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  required
                  className="hidden"
                  onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 self-start rounded-md border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
                >
                  <Upload className="h-4 w-4" />
                  Choose file
                </button>
                {fileName && <p className="truncate text-xs text-zinc-500">{fileName}</p>}
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}

              <button
                type="submit"
                disabled={pending}
                className="mt-1 self-start rounded-md bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700 disabled:opacity-50"
              >
                {pending ? "Uploading..." : "Upload"}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
