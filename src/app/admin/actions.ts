"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/auth";
import { slugify } from "@/lib/slug";

async function requireSuperAdmin() {
  const user = await getCurrentUser();
  if (!user?.isSuperAdmin) throw new Error("Not authorized.");
  return user;
}

function randomPassword() {
  const bytes = new Uint8Array(18);
  crypto.getRandomValues(bytes);
  return Buffer.from(bytes).toString("base64url");
}

interface CreateAccountState {
  error: string | null;
  ownerPassword?: string;
  ownerEmail?: string;
}

export async function createAccount(
  _prevState: CreateAccountState,
  formData: FormData
): Promise<CreateAccountState> {
  await requireSuperAdmin();

  const name = String(formData.get("name") ?? "").trim();
  const ownerEmail = String(formData.get("owner_email") ?? "").trim();

  if (!name || !ownerEmail) {
    return { error: "Organization name and email are required." };
  }

  const admin = createAdminClient();

  const { data: account, error: accountError } = await admin
    .from("accounts")
    .insert({ name, contact_email: ownerEmail })
    .select()
    .single();

  if (accountError || !account) {
    return { error: accountError?.message ?? "Failed to create account." };
  }

  const password = randomPassword();
  const { data: userData, error: userError } = await admin.auth.admin.createUser({
    email: ownerEmail,
    password,
    email_confirm: true,
  });

  if (userError || !userData.user) {
    await admin.from("accounts").delete().eq("id", account.id);
    return { error: userError?.message ?? "Failed to create owner user." };
  }

  const { error: linkError } = await admin.from("account_users").insert({
    account_id: account.id,
    user_id: userData.user.id,
    is_owner: true,
    can_checkin: true,
    can_manage_participants: true,
  });

  if (linkError) {
    return { error: linkError.message };
  }

  revalidatePath("/admin");
  revalidatePath("/admin/organizations");
  return { error: null, ownerPassword: password, ownerEmail };
}

export async function resetOwnerPassword(
  accountId: string
): Promise<{ error: string | null; password?: string; email?: string }> {
  await requireSuperAdmin();

  const admin = createAdminClient();
  const { data: owner } = await admin
    .from("account_users")
    .select("user_id")
    .eq("account_id", accountId)
    .eq("is_owner", true)
    .maybeSingle();

  if (!owner) return { error: "Owner not found." };

  const password = randomPassword();
  const { error } = await admin.auth.admin.updateUserById(owner.user_id, { password });
  if (error) return { error: error.message };

  const { data: directoryRow } = await admin
    .from("user_directory")
    .select("email")
    .eq("user_id", owner.user_id)
    .maybeSingle();

  return { error: null, password, email: directoryRow?.email };
}

export async function createEvent(formData: FormData) {
  await requireSuperAdmin();

  const accountId = String(formData.get("account_id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const slugInput = String(formData.get("slug") ?? "").trim();
  const ticketQuota = Number(formData.get("ticket_quota") ?? 0);
  const eventDate = String(formData.get("event_date") ?? "") || null;

  if (!accountId || !name || !ticketQuota) {
    throw new Error("Missing required fields.");
  }

  const slug = slugify(slugInput || name);
  const supabase = await createClient();

  const { error } = await supabase.from("events").insert({
    account_id: accountId,
    name,
    slug,
    ticket_quota: ticketQuota,
    event_date: eventDate,
  });

  if (error) throw new Error(error.message);

  revalidatePath(`/admin/accounts/${accountId}`);
  redirect(`/admin/accounts/${accountId}`);
}

export async function setAccountStatus(accountId: string, status: "active" | "suspended") {
  await requireSuperAdmin();
  const supabase = await createClient();
  const { error } = await supabase.from("accounts").update({ status }).eq("id", accountId);
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/accounts/${accountId}`);
  revalidatePath("/admin");
  revalidatePath("/admin/organizations");
}

export async function closeEvent(eventId: string) {
  const user = await requireSuperAdmin();
  const supabase = await createClient();
  const { error } = await supabase
    .from("events")
    .update({ status: "closed", closed_at: new Date().toISOString(), closed_by: user.id })
    .eq("id", eventId);
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/events/${eventId}`);
}

export async function reopenEvent(eventId: string) {
  await requireSuperAdmin();
  const supabase = await createClient();
  const { error } = await supabase
    .from("events")
    .update({ status: "active", closed_at: null, closed_by: null })
    .eq("id", eventId);
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/events/${eventId}`);
}
