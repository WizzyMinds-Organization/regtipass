import { notFound } from "next/navigation";
import { getEventContext } from "@/lib/event-context";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/dashboard/page-header";
import { deleteFormField } from "./actions";
import { AddFieldModal } from "./add-field-modal";

export default async function FormBuilderPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const ctx = await getEventContext(eventId);
  if (!ctx || !ctx.isOwner) notFound();

  const supabase = await createClient();
  const { data: fields } = await supabase
    .from("form_fields")
    .select("*")
    .eq("event_id", eventId)
    .order("sort_order");

  const editable = ctx.event.status === "active";

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Participant form"
        subtitle="Define which fields to collect for each participant before designing any ticket templates."
        action={editable && <AddFieldModal eventId={eventId} />}
      />

      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead className="bg-zinc-50 text-left text-zinc-500">
              <tr>
                <th className="px-4 py-2 font-medium">Label</th>
                <th className="px-4 py-2 font-medium">Key</th>
                <th className="px-4 py-2 font-medium">Type</th>
                <th className="px-4 py-2 font-medium">Required</th>
                {editable && <th className="px-4 py-2"></th>}
              </tr>
            </thead>
            <tbody>
              {(fields ?? []).map((f) => (
                <tr key={f.id} className="border-t border-zinc-100">
                  <td className="px-4 py-2 text-zinc-900">{f.label}</td>
                  <td className="px-4 py-2 font-mono text-xs text-zinc-500">{f.key}</td>
                  <td className="px-4 py-2 text-zinc-600">{f.field_type}</td>
                  <td className="px-4 py-2 text-zinc-600">{f.required ? "Yes" : "No"}</td>
                  {editable && (
                    <td className="px-4 py-2 text-right">
                      <form
                        action={async () => {
                          "use server";
                          await deleteFormField(eventId, f.id);
                        }}
                      >
                        <button className="text-xs text-red-600 hover:underline">Remove</button>
                      </form>
                    </td>
                  )}
                </tr>
              ))}
              {(fields ?? []).length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-zinc-400">
                    No fields yet — add &quot;Name&quot; to get started.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
