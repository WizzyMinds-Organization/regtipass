"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { FormField, Template } from "@/lib/supabase/types";
import { issueTicket } from "./actions";

export function IssueForm({
  eventId,
  fields,
  templates,
  remaining,
}: {
  eventId: string;
  fields: FormField[];
  templates: Template[];
  remaining: number;
}) {
  const router = useRouter();
  const [templateId, setTemplateId] = useState(templates[0]?.id ?? "");
  const [values, setValues] = useState<Record<string, string>>({});
  const [amount, setAmount] = useState(templates[0]?.price ?? 0);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [issuedTicketId, setIssuedTicketId] = useState<string | null>(null);

  function onTemplateChange(id: string) {
    setTemplateId(id);
    const t = templates.find((t) => t.id === id);
    if (t) setAmount(t.price);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const res = await issueTicket(eventId, templateId, values, amount);
    setPending(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    setIssuedTicketId(res.ticketId ?? null);
    setValues({});
    router.refresh();
  }

  async function share(ticketId: string) {
    const url = `/api/tickets/${ticketId}/render`;
    const res = await fetch(url);
    const blob = await res.blob();
    const file = new File([blob], `ticket-${ticketId}.png`, { type: "image/png" });

    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title: "Your ticket" });
    } else {
      window.open(url, "_blank");
    }
  }

  if (remaining <= 0) {
    return <p className="text-amber-700">Ticket quota reached for this event.</p>;
  }

  return (
    <div className="grid gap-6 sm:grid-cols-2">
      <form onSubmit={onSubmit} className="flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-5">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-zinc-600">Ticket template</label>
          <select
            value={templateId}
            onChange={(e) => onTemplateChange(e.target.value)}
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm"
          >
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-zinc-600">Amount collected</label>
          <input
            type="number"
            min={0}
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm"
          />
        </div>

        {fields.map((f) => (
          <div key={f.id} className="flex flex-col gap-1">
            <label className="text-xs font-medium text-zinc-600">
              {f.label}
              {f.required && " *"}
            </label>
            {f.field_type === "select" ? (
              <select
                required={f.required}
                value={values[f.key] ?? ""}
                onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
                className="rounded-md border border-zinc-300 px-3 py-2 text-sm"
              >
                <option value="">Select…</option>
                {(f.options ?? []).map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type={f.field_type === "number" ? "number" : f.field_type === "email" ? "email" : "text"}
                required={f.required}
                value={values[f.key] ?? ""}
                onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
                className="rounded-md border border-zinc-300 px-3 py-2 text-sm"
              />
            )}
          </div>
        ))}

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={pending}
          className="mt-2 self-start rounded-md bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700 disabled:opacity-50"
        >
          {pending ? "Issuing..." : "Issue ticket"}
        </button>
      </form>

      <div className="rounded-2xl border border-zinc-200 bg-white p-5">
        <h3 className="text-sm font-semibold text-zinc-900">Ticket preview</h3>
        {issuedTicketId ? (
          <div className="mt-3 flex flex-col gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/tickets/${issuedTicketId}/render`}
              alt="Ticket"
              className="w-full rounded-md border border-zinc-200"
            />
            <p className="text-center font-mono text-sm text-zinc-600">{issuedTicketId}</p>
            <div className="flex gap-2">
              <button
                onClick={() => share(issuedTicketId)}
                className="flex-1 rounded-md bg-orange-600 px-3 py-2 text-sm font-medium text-white hover:bg-orange-700"
              >
                Share
              </button>
              <a
                href={`/api/tickets/${issuedTicketId}/render?download=1`}
                className="flex-1 rounded-md border border-zinc-300 px-3 py-2 text-center text-sm font-medium text-zinc-700 hover:bg-zinc-50"
              >
                Download
              </a>
            </div>
          </div>
        ) : (
          <p className="mt-3 text-sm text-zinc-400">Issue a ticket to see it here.</p>
        )}
      </div>
    </div>
  );
}
