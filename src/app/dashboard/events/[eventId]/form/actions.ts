"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getEventContext } from "@/lib/event-context";
import { slugify } from "@/lib/slug";

async function requireOwner(eventId: string) {
  const ctx = await getEventContext(eventId);
  if (!ctx || !ctx.isOwner) throw new Error("Not authorized.");
  if (ctx.event.status !== "active") throw new Error("Event is closed.");
  return ctx;
}

export async function addFormField(eventId: string, formData: FormData) {
  await requireOwner(eventId);

  const label = String(formData.get("label") ?? "").trim();
  const fieldType = String(formData.get("field_type") ?? "text");
  const required = formData.get("required") === "on";
  const optionsRaw = String(formData.get("options") ?? "").trim();

  if (!label) throw new Error("Label is required.");

  const key = slugify(label).replace(/-/g, "_");
  const options = fieldType === "select" && optionsRaw
    ? optionsRaw.split(",").map((s) => s.trim()).filter(Boolean)
    : null;

  const supabase = await createClient();
  const { count } = await supabase
    .from("form_fields")
    .select("id", { count: "exact", head: true })
    .eq("event_id", eventId);

  const { error } = await supabase.from("form_fields").insert({
    event_id: eventId,
    key,
    label,
    field_type: fieldType,
    required,
    options,
    sort_order: count ?? 0,
  });

  if (error) throw new Error(error.message);
  revalidatePath(`/dashboard/events/${eventId}/form`);
}

export async function deleteFormField(eventId: string, fieldId: string) {
  await requireOwner(eventId);
  const supabase = await createClient();
  const { error } = await supabase.from("form_fields").delete().eq("id", fieldId);
  if (error) throw new Error(error.message);
  revalidatePath(`/dashboard/events/${eventId}/form`);
}
