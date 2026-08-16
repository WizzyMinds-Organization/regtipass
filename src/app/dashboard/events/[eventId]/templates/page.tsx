import { notFound } from "next/navigation";
import Link from "next/link";
import { getEventContext } from "@/lib/event-context";
import { createClient } from "@/lib/supabase/server";
import { UploadTemplateForm } from "./upload-form";
import { DeleteTemplateButton } from "./delete-button";

export default async function TemplatesPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const ctx = await getEventContext(eventId);
  if (!ctx || !ctx.isOwner) notFound();

  const supabase = await createClient();
  const { data: templates } = await supabase
    .from("templates")
    .select("*")
    .eq("event_id", eventId)
    .order("created_at", { ascending: false });

  const withUrls = (templates ?? []).map((t) => ({
    ...t,
    url: supabase.storage.from("templates").getPublicUrl(t.image_path).data.publicUrl,
  }));

  const editable = ctx.event.status === "active";

  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-zinc-500">
        Upload artwork for each ticket tier, then place the QR code, printed ticket ID, and
        participant field anchors on top of it.
      </p>

      <div className="grid gap-4 sm:grid-cols-3">
        {withUrls.map((t) => (
          <Link
            key={t.id}
            href={`/dashboard/events/${eventId}/templates/${t.id}`}
            className="group overflow-hidden rounded-lg border border-zinc-200 bg-white hover:border-zinc-400"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={t.url} alt={t.name} className="aspect-[3/2] w-full object-cover" />
            <div className="flex items-center justify-between p-3">
              <span className="text-sm font-medium text-zinc-900">{t.name}</span>
              {editable && <DeleteTemplateButton eventId={eventId} templateId={t.id} />}
            </div>
          </Link>
        ))}
      </div>

      {editable && <UploadTemplateForm eventId={eventId} />}
    </div>
  );
}
