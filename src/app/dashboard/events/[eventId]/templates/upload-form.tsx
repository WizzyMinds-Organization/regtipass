"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function UploadTemplateForm({ eventId }: { eventId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    <div className="rounded-lg border border-zinc-200 bg-white p-5">
      <h2 className="text-sm font-semibold text-zinc-900">New template</h2>
      <form onSubmit={onSubmit} className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-zinc-600">Template name</label>
          <input
            name="name"
            required
            placeholder="e.g. VIP"
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-zinc-600">Artwork (PNG/JPEG/WebP)</label>
          <input
            name="file"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            required
            className="text-sm"
          />
        </div>
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
        >
          {pending ? "Uploading..." : "Upload"}
        </button>
      </form>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
