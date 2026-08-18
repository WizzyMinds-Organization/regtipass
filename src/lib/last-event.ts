"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/auth";

export async function setLastEvent(eventId: string) {
  const user = await getCurrentUser();
  if (!user) return;

  const admin = createAdminClient();
  await admin
    .from("user_last_event")
    .upsert({ user_id: user.id, event_id: eventId, updated_at: new Date().toISOString() });
}

export async function getLastEventId(): Promise<string | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  const admin = createAdminClient();
  const { data } = await admin
    .from("user_last_event")
    .select("event_id")
    .eq("user_id", user.id)
    .maybeSingle();

  return data?.event_id ?? null;
}
