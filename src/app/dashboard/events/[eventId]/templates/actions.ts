"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getEventContext } from "@/lib/event-context";
import type { AnchorKind, TemplateAnchor } from "@/lib/supabase/types";

type AnchorPatch = Partial<{
  x: number;
  y: number;
  width: number;
  height: number;
  font: string;
  font_size: number;
  align: "left" | "center" | "right";
  color: string;
  visible: boolean;
}>;

async function requireFormManager(eventId: string) {
  const ctx = await getEventContext(eventId);
  if (!ctx || !ctx.canManageForm) throw new Error("Not authorized.");
  if (ctx.event.status !== "active") throw new Error("Event is closed.");
  return ctx;
}

export async function updateTemplatePrice(eventId: string, templateId: string, price: number) {
  await requireFormManager(eventId);
  if (!Number.isFinite(price) || price < 0) throw new Error("Price must be a non-negative number.");
  const supabase = await createClient();
  const { error } = await supabase.from("templates").update({ price }).eq("id", templateId);
  if (error) throw new Error(error.message);
  revalidatePath(`/dashboard/events/${eventId}/templates`);
  revalidatePath(`/dashboard/events/${eventId}/templates/${templateId}`);
}

export async function deleteTemplate(eventId: string, templateId: string) {
  await requireFormManager(eventId);
  const supabase = await createClient();
  const { error } = await supabase.from("templates").delete().eq("id", templateId);
  if (error) throw new Error(error.message);
  revalidatePath(`/dashboard/events/${eventId}/templates`);
}

export async function addAnchor(
  eventId: string,
  templateId: string,
  kind: AnchorKind,
  fieldKey: string | null
): Promise<TemplateAnchor> {
  await requireFormManager(eventId);
  const supabase = await createClient();

  const defaults: Record<AnchorKind, { width: number; height: number; font_size: number }> = {
    qr: { width: 150, height: 150, font_size: 16 },
    ticket_id: { width: 200, height: 24, font_size: 14 },
    field: { width: 200, height: 24, font_size: 16 },
  };

  const { data, error } = await supabase
    .from("template_anchors")
    .insert({
      template_id: templateId,
      kind,
      field_key: fieldKey,
      x: 20,
      y: 20,
      ...defaults[kind],
    })
    .select()
    .single();

  if (error || !data) throw new Error(error?.message ?? "Failed to add anchor.");
  return data;
}

export async function deleteAnchor(eventId: string, templateId: string, anchorId: string) {
  await requireFormManager(eventId);
  const supabase = await createClient();
  const { error } = await supabase.from("template_anchors").delete().eq("id", anchorId);
  if (error) throw new Error(error.message);
}

/**
 * Persists all locally-edited anchors in one batch, called only when the
 * user clicks Save — not on every drag/keystroke — to avoid a server round
 * trip per micro-edit.
 */
export async function saveAnchors(
  eventId: string,
  templateId: string,
  updates: { id: string; patch: AnchorPatch }[]
) {
  await requireFormManager(eventId);
  if (updates.length === 0) return;
  const supabase = await createClient();

  const results = await Promise.all(
    updates.map(({ id, patch }) => supabase.from("template_anchors").update(patch).eq("id", id))
  );
  const failed = results.find((r) => r.error);
  if (failed?.error) throw new Error(failed.error.message);

  revalidatePath(`/dashboard/events/${eventId}/templates/${templateId}`);
}
