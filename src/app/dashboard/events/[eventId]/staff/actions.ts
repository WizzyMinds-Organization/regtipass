"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getEventContext } from "@/lib/event-context";
import type { StaffRole } from "@/lib/supabase/types";

const VALID_ROLES: StaffRole[] = ["manager", "issuer", "checkin"];

interface InviteStaffState {
  error: string | null;
  email?: string;
  invited?: boolean;
}

export async function inviteStaff(
  eventId: string,
  _prevState: InviteStaffState,
  formData: FormData
): Promise<InviteStaffState> {
  const ctx = await getEventContext(eventId);
  if (!ctx || !ctx.isOwner) return { error: "Not authorized." };

  const email = String(formData.get("email") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const role = String(formData.get("role") ?? "") as StaffRole;

  if (!email) return { error: "Email is required." };
  if (!name) return { error: "Name is required." };
  if (!VALID_ROLES.includes(role)) return { error: "Choose a role." };

  const admin = createAdminClient();

  const { data: existing } = await admin
    .from("account_users")
    .select("id, user_id")
    .eq("account_id", ctx.event.account_id);

  let userId: string | null = null;

  const { data: existingDirectoryUser } = await admin
    .from("user_directory")
    .select("user_id")
    .eq("email", email.toLowerCase())
    .maybeSingle();

  if (existingDirectoryUser) {
    userId = existingDirectoryUser.user_id;
  } else {
    if (password.length < 8) return { error: "Password must be at least 8 characters." };
    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (createError || !created.user) {
      return { error: createError?.message ?? "Failed to create user." };
    }
    userId = created.user.id;
  }

  const alreadyMember = (existing ?? []).some((m) => m.user_id === userId);
  if (alreadyMember) {
    const { error } = await admin
      .from("account_users")
      .update({ role, name })
      .eq("account_id", ctx.event.account_id)
      .eq("user_id", userId);
    if (error) return { error: error.message };
  } else {
    const { error } = await admin.from("account_users").insert({
      account_id: ctx.event.account_id,
      user_id: userId,
      is_owner: false,
      role,
      name,
    });
    if (error) return { error: error.message };
  }

  revalidatePath(`/dashboard/events/${eventId}/staff`);
  return { error: null, email, invited: true };
}

export async function removeStaff(eventId: string, accountUserId: string) {
  const ctx = await getEventContext(eventId);
  if (!ctx || !ctx.isOwner) throw new Error("Not authorized.");

  const supabase = await createClient();
  const { error } = await supabase
    .from("account_users")
    .delete()
    .eq("id", accountUserId)
    .eq("is_owner", false);
  if (error) throw new Error(error.message);
  revalidatePath(`/dashboard/events/${eventId}/staff`);
}

export async function resetStaffPassword(
  eventId: string,
  accountUserId: string,
  password: string
): Promise<{ error: string | null }> {
  const ctx = await getEventContext(eventId);
  if (!ctx || !ctx.isOwner) return { error: "Not authorized." };
  if (password.length < 8) return { error: "Password must be at least 8 characters." };

  const admin = createAdminClient();
  const { data: member } = await admin
    .from("account_users")
    .select("user_id, account_id, is_owner")
    .eq("id", accountUserId)
    .maybeSingle();

  if (!member || member.account_id !== ctx.event.account_id || member.is_owner) {
    return { error: "Staff member not found." };
  }

  const { error } = await admin.auth.admin.updateUserById(member.user_id, { password });
  if (error) return { error: error.message };

  return { error: null };
}

export async function updateStaffRole(eventId: string, accountUserId: string, role: StaffRole) {
  const ctx = await getEventContext(eventId);
  if (!ctx || !ctx.isOwner) throw new Error("Not authorized.");
  if (!VALID_ROLES.includes(role)) throw new Error("Invalid role.");

  const supabase = await createClient();
  const { error } = await supabase
    .from("account_users")
    .update({ role })
    .eq("id", accountUserId)
    .eq("is_owner", false);
  if (error) throw new Error(error.message);
  revalidatePath(`/dashboard/events/${eventId}/staff`);
}
