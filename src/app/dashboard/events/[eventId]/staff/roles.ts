import type { StaffRole } from "@/lib/supabase/types";

export const ROLE_LABELS: Record<StaffRole, string> = {
  manager: "Manager",
  issuer: "Issuer",
  checkin: "Check-in Staff",
};

export const ROLE_DESCRIPTIONS: Record<StaffRole, string> = {
  manager: "Edit forms & ticket templates, issue tickets, check in guests.",
  issuer: "Issue tickets and check in guests.",
  checkin: "Check in guests only. Sees who's checked in, who's pending — no ticket IDs.",
};
