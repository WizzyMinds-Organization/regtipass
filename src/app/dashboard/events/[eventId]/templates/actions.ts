"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getEventContext } from "@/lib/event-context";
import type { AnchorKind } from "@/lib/supabase/types";

async function requireOwner(eventId: string) {
  const ctx = await getEventContext(eventId);
  if (!ctx || !ctx.isOwner) throw new Error("Not authorized.");
  if (ctx.event.status !== "active") throw new Error("Event is closed.");
  return ctx;
}

export async function deleteTemplate(eventId: string, templateId: string) {
  await requireOwner(eventId);
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
) {
  await requireOwner(eventId);
  const supabase = await createClient();

  const defaults: Record<AnchorKind, { width: number; height: number; font_size: number }> = {
    qr: { width: 150, height: 150, font_size: 16 },
    ticket_id: { width: 200, height: 24, font_size: 14 },
    field: { width: 200, height: 24, font_size: 16 },
  };

  const { error } = await supabase.from("template_anchors").insert({
    template_id: templateId,
    kind,
    field_key: fieldKey,
    x: 20,
    y: 20,
    ...defaults[kind],
  });

  if (error) throw new Error(error.message);
  revalidatePath(`/dashboard/events/${eventId}/templates/${templateId}`);
}

export async function updateAnchor(
  eventId: string,
  templateId: string,
  anchorId: string,
  patch: Partial<{
    x: number;
    y: number;
    width: number;
    height: number;
    font: string;
    font_size: number;
    align: "left" | "center" | "right";
    color: string;
    visible: boolean;
  }>
) {
  await requireOwner(eventId);
  const supabase = await createClient();
  const { error } = await supabase.from("template_anchors").update(patch).eq("id", anchorId);
  if (error) throw new Error(error.message);
  revalidatePath(`/dashboard/events/${eventId}/templates/${templateId}`);
}

export async function deleteAnchor(eventId: string, templateId: string, anchorId: string) {
  await requireOwner(eventId);
  const supabase = await createClient();
  const { error } = await supabase.from("template_anchors").delete().eq("id", anchorId);
  if (error) throw new Error(error.message);
  revalidatePath(`/dashboard/events/${eventId}/templates/${templateId}`);
}
