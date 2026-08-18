import { notFound } from "next/navigation";
import { getEventContext } from "@/lib/event-context";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/dashboard/page-header";
import { DesignTabs } from "./design-tabs";

export default async function FormAndTemplatesPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const ctx = await getEventContext(eventId);
  if (!ctx || !ctx.canManageForm) notFound();

  const supabase = await createClient();
  const [{ data: fields }, { data: templates }] = await Promise.all([
    supabase.from("form_fields").select("*").eq("event_id", eventId).order("sort_order"),
    supabase.from("templates").select("*").eq("event_id", eventId).order("created_at", { ascending: false }),
  ]);

  const templatesWithUrls = (templates ?? []).map((t) => ({
    id: t.id,
    name: t.name,
    price: t.price,
    url: supabase.storage.from("templates").getPublicUrl(t.image_path).data.publicUrl,
  }));

  const editable = ctx.event.status === "active";

  return (
    <div className="flex flex-col">
      <PageHeader title="Form & templates" compact />
      <DesignTabs eventId={eventId} fields={fields ?? []} templates={templatesWithUrls} editable={editable} />
    </div>
  );
}
