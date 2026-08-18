import { notFound } from "next/navigation";
import Link from "next/link";
import { getEventContext } from "@/lib/event-context";
import { createClient } from "@/lib/supabase/server";
import { TemplateEditor } from "./editor";

export default async function TemplateEditorPage({
  params,
}: {
  params: Promise<{ eventId: string; templateId: string }>;
}) {
  const { eventId, templateId } = await params;
  const ctx = await getEventContext(eventId);
  if (!ctx || !ctx.canManageForm) notFound();

  const supabase = await createClient();
  const [{ data: template }, { data: anchors }, { data: fields }] = await Promise.all([
    supabase.from("templates").select("*").eq("id", templateId).maybeSingle(),
    supabase.from("template_anchors").select("*").eq("template_id", templateId).order("created_at"),
    supabase.from("form_fields").select("*").eq("event_id", eventId).order("sort_order"),
  ]);

  if (!template || template.event_id !== eventId) notFound();

  const imageUrl = supabase.storage.from("templates").getPublicUrl(template.image_path).data.publicUrl;

  return (
    <div className="flex flex-col gap-4">
      <Link href={`/dashboard/events/${eventId}/form?tab=templates`} className="text-sm text-zinc-500 hover:underline">
        ← Ticket templates
      </Link>
      <TemplateEditor
        eventId={eventId}
        template={template}
        imageUrl={imageUrl}
        initialAnchors={anchors ?? []}
        fields={fields ?? []}
        editable={ctx.event.status === "active"}
      />
    </div>
  );
}
