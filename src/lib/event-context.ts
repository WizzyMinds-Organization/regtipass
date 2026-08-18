import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import type { Event, StaffRole } from "@/lib/supabase/types";

export interface EventContext {
  event: Event;
  isOwner: boolean;
  role: StaffRole | null;
  canManageForm: boolean;
  canManageParticipants: boolean;
  canCheckin: boolean;
  /** True when the member's only capability is checking guests in — used to
   * restrict the guest view (no ticket IDs) and to auto-redirect them
   * straight to the check-in page instead of the event overview. */
  checkinOnly: boolean;
}

function deriveFromRole(isOwner: boolean, role: StaffRole | null) {
  if (isOwner) {
    return { canManageForm: true, canManageParticipants: true, canCheckin: true, checkinOnly: false };
  }
  switch (role) {
    case "manager":
      return { canManageForm: true, canManageParticipants: true, canCheckin: true, checkinOnly: false };
    case "issuer":
      return { canManageForm: false, canManageParticipants: true, canCheckin: true, checkinOnly: false };
    case "checkin":
      return { canManageForm: false, canManageParticipants: false, canCheckin: true, checkinOnly: true };
    default:
      return { canManageForm: false, canManageParticipants: false, canCheckin: false, checkinOnly: false };
  }
}

export const getEventContext = cache(async (eventId: string): Promise<EventContext | null> => {
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
    return {
      event,
      isOwner: true,
      role: null,
      canManageForm: true,
      canManageParticipants: true,
      canCheckin: true,
      checkinOnly: false,
    };
  }

  const membership = user.memberships.find((m) => m.account_id === event.account_id);
  if (!membership) return null;

  return {
    event,
    isOwner: membership.is_owner,
    role: membership.role,
    ...deriveFromRole(membership.is_owner, membership.role),
  };
});
