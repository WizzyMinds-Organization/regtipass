"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { FormField } from "@/lib/supabase/types";
import { FormBuilder } from "./form-builder";
import { UploadTemplateForm } from "../templates/upload-form";
import { DeleteTemplateButton } from "../templates/delete-button";

type TemplateWithUrl = {
  id: string;
  name: string;
  price: number;
  url: string;
};

export function DesignTabs({
  eventId,
  fields,
  templates,
  editable,
}: {
  eventId: string;
  fields: FormField[];
  templates: TemplateWithUrl[];
  editable: boolean;
}) {
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<"form" | "templates">(
    searchParams.get("tab") === "templates" ? "templates" : "form"
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-1 border-b border-zinc-200">
        <button
          onClick={() => setTab("form")}
          className={`border-b-2 px-3 py-2 text-sm font-medium ${
            tab === "form" ? "border-orange-600 text-orange-700" : "border-transparent text-zinc-500 hover:text-zinc-900"
          }`}
        >
          1. Form
        </button>
        <button
          onClick={() => setTab("templates")}
          className={`border-b-2 px-3 py-2 text-sm font-medium ${
            tab === "templates" ? "border-orange-600 text-orange-700" : "border-transparent text-zinc-500 hover:text-zinc-900"
          }`}
        >
          2. Ticket templates
        </button>
      </div>

      {tab === "form" ? (
        <>
          <p className="text-sm text-zinc-500">
            Define which fields to collect for each participant, then switch to Ticket templates to design the
            ticket.
          </p>
          <FormBuilder eventId={eventId} initialFields={fields} editable={editable} />
        </>
      ) : (
        <>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-zinc-500">
              Upload artwork for each ticket tier, then place the QR code, printed ticket ID, and participant
              field anchors on top of it.
            </p>
            {editable && <UploadTemplateForm eventId={eventId} />}
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {templates.map((t) => (
              <div
                key={t.id}
                className="group overflow-hidden rounded-2xl border border-zinc-200 bg-white hover:border-zinc-400"
              >
                <Link href={`/dashboard/events/${eventId}/templates/${t.id}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={t.url} alt={t.name} className="aspect-[3/2] w-full object-cover" />
                </Link>
                <div className="flex items-center justify-between p-3">
                  <Link href={`/dashboard/events/${eventId}/templates/${t.id}`} className="min-w-0">
                    <span className="text-sm font-medium text-zinc-900">{t.name}</span>
                    <p className="text-xs text-zinc-500">{t.price > 0 ? t.price : "Free"}</p>
                  </Link>
                  {editable && <DeleteTemplateButton eventId={eventId} templateId={t.id} />}
                </div>
              </div>
            ))}
            {templates.length === 0 && (
              <div className="col-span-full rounded-2xl border border-dashed border-zinc-300 bg-white p-8 text-center text-sm text-zinc-400">
                No ticket templates yet.
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
