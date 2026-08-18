"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getEventContext } from "@/lib/event-context";
import { getCurrentUser } from "@/lib/auth";
import type { HandoverRecipientType } from "@/lib/supabase/types";

export async function recordHandover(
  eventId: string,
  formData: FormData
): Promise<{ error: string | null }> {
  const ctx = await getEventContext(eventId);
  if (!ctx || !ctx.isOwner) return { error: "Not authorized." };
  if (ctx.event.status !== "active") return { error: "Event is closed." };

  const user = await getCurrentUser();
  if (!user) return { error: "Not authorized." };

  const amount = Number(formData.get("amount"));
  const recipientType = String(formData.get("recipient_type") ?? "") as HandoverRecipientType;
  const recipientName = String(formData.get("recipient_name") ?? "").trim() || null;
  const note = String(formData.get("note") ?? "").trim() || null;
  const staffUserIdRaw = String(formData.get("staff_user_id") ?? "");
  const staffUserId = staffUserIdRaw || user.id;

  if (!Number.isFinite(amount) || amount <= 0) {
    return { error: "Amount must be a positive number." };
  }
  if (!["organizer", "finance", "vendor", "other"].includes(recipientType)) {
    return { error: "Choose who received the money." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("cash_handovers").insert({
    event_id: eventId,
    staff_user_id: staffUserId,
    amount,
    recipient_type: recipientType,
    recipient_name: recipientName,
    note,
  });

  if (error) return { error: error.message };

  revalidatePath(`/dashboard/events/${eventId}/sales`);
  return { error: null };
}

export async function deleteHandover(eventId: string, handoverId: string) {
  const ctx = await getEventContext(eventId);
  if (!ctx || !ctx.isOwner) throw new Error("Not authorized.");

  const supabase = await createClient();
  const { error } = await supabase
    .from("cash_handovers")
    .delete()
    .eq("id", handoverId)
    .eq("event_id", eventId);
  if (error) throw new Error(error.message);
  revalidatePath(`/dashboard/events/${eventId}/sales`);
}
