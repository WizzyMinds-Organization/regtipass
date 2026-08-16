import "server-only";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import type { Event } from "@/lib/supabase/types";

export interface EventContext {
  event: Event;
  isOwner: boolean;
  canManageParticipants: boolean;
  canCheckin: boolean;
}

export async function getEventContext(eventId: string): Promise<EventContext | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  const supabase = await createClient();
  const { data: event } = await supabase
    .from("events")
    .select("*")
    .eq("id", eventId)
    .maybeSingle();

  if (!event) return null;

  if (user.isSuperAdmin) {
    return { event, isOwner: true, canManageParticipants: true, canCheckin: true };
  }

  const membership = user.memberships.find((m) => m.account_id === event.account_id);
  if (!membership) return null;

  return {
    event,
    isOwner: membership.is_owner,
    canManageParticipants: membership.is_owner || membership.can_manage_participants,
    canCheckin: membership.is_owner || membership.can_checkin,
  };
}
