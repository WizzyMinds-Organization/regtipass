"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getEventContext } from "@/lib/event-context";

function randomPassword() {
  const bytes = new Uint8Array(18);
  crypto.getRandomValues(bytes);
  return Buffer.from(bytes).toString("base64url");
}

interface InviteStaffState {
  error: string | null;
  password?: string;
  email?: string;
}

export async function inviteStaff(
  eventId: string,
  _prevState: InviteStaffState,
  formData: FormData
): Promise<InviteStaffState> {
  const ctx = await getEventContext(eventId);
  if (!ctx || !ctx.isOwner) return { error: "Not authorized." };

  const email = String(formData.get("email") ?? "").trim();
  const canCheckin = formData.get("can_checkin") === "on";
  const canManageParticipants = formData.get("can_manage_participants") === "on";

  if (!email) return { error: "Email is required." };
  if (!canCheckin && !canManageParticipants) {
    return { error: "Grant at least one permission." };
  }

  const admin = createAdminClient();

  const { data: existing } = await admin
    .from("account_users")
    .select("id, user_id")
    .eq("account_id", ctx.event.account_id);

  let userId: string | null = null;
  let password: string | undefined;

  const { data: existingDirectoryUser } = await admin
    .from("user_directory")
    .select("user_id")
    .eq("email", email.toLowerCase())
    .maybeSingle();

  if (existingDirectoryUser) {
    userId = existingDirectoryUser.user_id;
  } else {
    password = randomPassword();
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
      .update({ can_checkin: canCheckin, can_manage_participants: canManageParticipants })
      .eq("account_id", ctx.event.account_id)
      .eq("user_id", userId);
    if (error) return { error: error.message };
  } else {
    const { error } = await admin.from("account_users").insert({
      account_id: ctx.event.account_id,
      user_id: userId,
      is_owner: false,
      can_checkin: canCheckin,
      can_manage_participants: canManageParticipants,
    });
    if (error) return { error: error.message };
  }

  revalidatePath(`/dashboard/events/${eventId}/staff`);
  return { error: null, password, email };
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
  accountUserId: string
): Promise<{ error: string | null; password?: string }> {
  const ctx = await getEventContext(eventId);
  if (!ctx || !ctx.isOwner) return { error: "Not authorized." };

  const admin = createAdminClient();
  const { data: member } = await admin
    .from("account_users")
    .select("user_id, account_id, is_owner")
    .eq("id", accountUserId)
    .maybeSingle();

  if (!member || member.account_id !== ctx.event.account_id || member.is_owner) {
    return { error: "Staff member not found." };
  }

  const password = randomPassword();
  const { error } = await admin.auth.admin.updateUserById(member.user_id, { password });
  if (error) return { error: error.message };

  return { error: null, password };
}

export async function updateStaffPermissions(
  eventId: string,
  accountUserId: string,
  canCheckin: boolean,
  canManageParticipants: boolean
) {
  const ctx = await getEventContext(eventId);
  if (!ctx || !ctx.isOwner) throw new Error("Not authorized.");

  const supabase = await createClient();
  const { error } = await supabase
    .from("account_users")
    .update({ can_checkin: canCheckin, can_manage_participants: canManageParticipants })
    .eq("id", accountUserId)
    .eq("is_owner", false);
  if (error) throw new Error(error.message);
  revalidatePath(`/dashboard/events/${eventId}/staff`);
}
