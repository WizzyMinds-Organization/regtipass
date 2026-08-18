"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getEventContext } from "@/lib/event-context";
import { slugify } from "@/lib/slug";
import type { FieldType, FormField } from "@/lib/supabase/types";

async function requireFormManager(eventId: string) {
  const ctx = await getEventContext(eventId);
  if (!ctx || !ctx.canManageForm) throw new Error("Not authorized.");
  if (ctx.event.status !== "active") throw new Error("Event is closed.");
  return ctx;
}

export async function createFormField(
  eventId: string,
  input: { label: string; field_type: FieldType; required: boolean; options: string[] | null; show_on_ticket: boolean }
): Promise<FormField> {
  await requireFormManager(eventId);

  const supabase = await createClient();
  const { count } = await supabase
    .from("form_fields")
    .select("id", { count: "exact", head: true })
    .eq("event_id", eventId);

  const key = `${slugify(input.label || "field").replace(/-/g, "_") || "field"}_${(count ?? 0) + 1}`;

  const { data, error } = await supabase
    .from("form_fields")
    .insert({
      event_id: eventId,
      key,
      label: input.label,
      field_type: input.field_type,
      required: input.required,
      options: input.options,
      show_on_ticket: input.show_on_ticket,
      sort_order: count ?? 0,
    })
    .select()
    .single();

  if (error || !data) throw new Error(error?.message ?? "Failed to add field.");
  revalidatePath(`/dashboard/events/${eventId}/form`);
  return data;
}

export async function updateFormField(
  eventId: string,
  fieldId: string,
  patch: Partial<{
    label: string;
    field_type: FieldType;
    required: boolean;
    options: string[] | null;
    show_on_ticket: boolean;
  }>
): Promise<{ error: string | null }> {
  await requireFormManager(eventId);
  const supabase = await createClient();
  const { error } = await supabase.from("form_fields").update(patch).eq("id", fieldId);
  if (error) return { error: error.message };
  revalidatePath(`/dashboard/events/${eventId}/form`);
  return { error: null };
}

export async function reorderFormFields(eventId: string, orderedIds: string[]) {
  await requireFormManager(eventId);
  const supabase = await createClient();
  const results = await Promise.all(
    orderedIds.map((id, index) => supabase.from("form_fields").update({ sort_order: index }).eq("id", id))
  );
  const failed = results.find((r) => r.error);
  if (failed?.error) throw new Error(failed.error.message);
  revalidatePath(`/dashboard/events/${eventId}/form`);
}

export async function deleteFormField(eventId: string, fieldId: string) {
  await requireFormManager(eventId);
  const supabase = await createClient();
  const { error } = await supabase.from("form_fields").delete().eq("id", fieldId);
  if (error) throw new Error(error.message);
  revalidatePath(`/dashboard/events/${eventId}/form`);
}
