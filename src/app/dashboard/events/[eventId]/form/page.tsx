import { notFound } from "next/navigation";
import { getEventContext } from "@/lib/event-context";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/dashboard/page-header";
import { addFormField, deleteFormField } from "./actions";

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

  const addField = async (formData: FormData) => {
    "use server";
    await addFormField(eventId, formData);
  };

  const editable = ctx.event.status === "active";

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Participant form"
        subtitle="Define which fields to collect for each participant before designing any ticket templates."
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
                    No fields yet — add "Name" to get started.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {editable && (
        <div className="rounded-2xl border border-zinc-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-zinc-900">Add field</h2>
          <form action={addField} className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:items-end">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-zinc-600">Label</label>
              <input
                name="label"
                required
                placeholder="e.g. Full name"
                className="rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-emerald-500"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-zinc-600">Type</label>
              <select
                name="field_type"
                className="rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-emerald-500"
              >
                <option value="text">Text</option>
                <option value="email">Email</option>
                <option value="phone">Phone</option>
                <option value="number">Number</option>
                <option value="select">Single select</option>
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-zinc-600">
                Options (comma-separated, for select)
              </label>
              <input
                name="options"
                placeholder="VIP, General"
                className="rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-emerald-500"
              />
            </div>
            <div className="flex items-center gap-2 lg:pb-2">
              <input id="required" name="required" type="checkbox" />
              <label htmlFor="required" className="text-sm text-zinc-700">
                Required
              </label>
            </div>
            <button
              type="submit"
              className="col-span-1 self-start rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 sm:col-span-2 lg:col-span-4"
            >
              Add field
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
