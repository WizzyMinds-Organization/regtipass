"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getEventContext } from "@/lib/event-context";
import { getCurrentUser } from "@/lib/auth";
import { generateTicketId } from "@/lib/slug";
import { warmTemplateBackground } from "@/lib/render-ticket";

// Called as soon as the issue form loads / the template selection changes —
// well before the staff member finishes filling the form and submits — so
// the artwork is already downloaded and cached by the time a ticket exists
// and its preview needs to render. Fire-and-forget from the client; a
// failure here just means the first render pays the normal download cost.
export async function prefetchTemplateBackground(eventId: string, templateId: string): Promise<void> {
  const ctx = await getEventContext(eventId);
  if (!ctx || !ctx.canManageParticipants) return;

  const supabase = await createClient();
  const { data: template } = await supabase
    .from("templates")
    .select("image_path")
    .eq("id", templateId)
    .eq("event_id", eventId)
    .maybeSingle();
  if (!template) return;

  await warmTemplateBackground(template.image_path);
}

export async function issueTicket(
  eventId: string,
  templateId: string,
  data: Record<string, string>,
  amountCollected: number
): Promise<{ error: string | null; ticketId?: string }> {
  const ctx = await getEventContext(eventId);
  if (!ctx || !ctx.canManageParticipants) return { error: "Not authorized." };
  if (ctx.event.status !== "active") return { error: "Event is closed." };
  if (!Number.isFinite(amountCollected) || amountCollected < 0) {
    return { error: "Amount collected must be a non-negative number." };
  }

  const supabase = await createClient();
  const user = await getCurrentUser();

  const { data: fields } = await supabase.from("form_fields").select("*").eq("event_id", eventId);
  for (const f of fields ?? []) {
    if (f.required && !data[f.key]?.trim()) {
      return { error: `"${f.label}" is required.` };
    }
  }

  const cleaned: Record<string, string> = {};
  for (const f of fields ?? []) {
    if (data[f.key] !== undefined) cleaned[f.key] = String(data[f.key]).slice(0, 500);
  }

  for (let attempt = 0; attempt < 5; attempt++) {
    const id = generateTicketId();
    const { error } = await supabase.from("tickets").insert({
      id,
      event_id: eventId,
      template_id: templateId,
      participant_data: cleaned,
      issued_by: user?.id ?? null,
      amount_collected: amountCollected,
    });

    if (!error) {
      revalidatePath(`/dashboard/events/${eventId}`);
      return { error: null, ticketId: id };
    }

    if (error.code !== "23505") {
      return { error: error.message };
    }
  }

  return { error: "Could not generate a unique ticket ID, please try again." };
}

export async function deleteTicket(eventId: string, ticketId: string): Promise<{ error: string | null }> {
  const ctx = await getEventContext(eventId);
  if (!ctx || !ctx.canManageParticipants) return { error: "Not authorized." };

  const supabase = await createClient();
  const { error } = await supabase.from("tickets").delete().eq("id", ticketId).eq("event_id", eventId);
  if (error) return { error: error.message };

  revalidatePath(`/dashboard/events/${eventId}`);
  return { error: null };
}
