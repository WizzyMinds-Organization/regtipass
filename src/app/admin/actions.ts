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

interface CreateAccountState {
  error: string | null;
  ownerEmail?: string;
  created?: boolean;
}

export async function createAccount(
  _prevState: CreateAccountState,
  formData: FormData
): Promise<CreateAccountState> {
  await requireSuperAdmin();

  const name = String(formData.get("name") ?? "").trim();
  const ownerName = String(formData.get("owner_name") ?? "").trim();
  const ownerEmail = String(formData.get("owner_email") ?? "").trim();
  const password = String(formData.get("owner_password") ?? "");

  if (!name || !ownerName || !ownerEmail) {
    return { error: "Organization name, owner name, and owner email are required." };
  }
  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." };
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
    name: ownerName,
  });

  if (linkError) {
    return { error: linkError.message };
  }

  revalidatePath("/admin");
  revalidatePath("/admin/organizations");
  return { error: null, ownerEmail, created: true };
}

export async function resetOwnerPassword(
  accountId: string,
  password: string
): Promise<{ error: string | null }> {
  await requireSuperAdmin();

  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }

  const admin = createAdminClient();
  const { data: owner } = await admin
    .from("account_users")
    .select("user_id")
    .eq("account_id", accountId)
    .eq("is_owner", true)
    .maybeSingle();

  if (!owner) return { error: "Owner not found." };

  const { error } = await admin.auth.admin.updateUserById(owner.user_id, { password });
  if (error) return { error: error.message };

  return { error: null };
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

export async function deleteEvent(eventId: string): Promise<{ error: string | null }> {
  await requireSuperAdmin();
  const admin = createAdminClient();

  const { data: templates } = await admin.from("templates").select("id").eq("event_id", eventId);
  const templateIds = (templates ?? []).map((t) => t.id);

  if (templateIds.length > 0) {
    const { error: anchorsError } = await admin
      .from("template_anchors")
      .delete()
      .in("template_id", templateIds);
    if (anchorsError) return { error: anchorsError.message };
  }

  // check_ins references tickets, so it must go first in case there's no
  // DB-level cascade on that foreign key.
  const { error: checkInsError } = await admin.from("check_ins").delete().eq("event_id", eventId);
  if (checkInsError) return { error: checkInsError.message };

  const steps = [
    admin.from("tickets").delete().eq("event_id", eventId),
    admin.from("cash_handovers").delete().eq("event_id", eventId),
    admin.from("form_fields").delete().eq("event_id", eventId),
    admin.from("templates").delete().eq("event_id", eventId),
  ];
  const results = await Promise.all(steps);
  const failed = results.find((r) => r.error);
  if (failed?.error) return { error: failed.error.message };

  const { data: event, error: fetchError } = await admin
    .from("events")
    .select("account_id")
    .eq("id", eventId)
    .maybeSingle();
  if (fetchError) return { error: fetchError.message };

  const { error } = await admin.from("events").delete().eq("id", eventId);
  if (error) return { error: error.message };

  if (event) revalidatePath(`/admin/accounts/${event.account_id}`);
  revalidatePath("/admin");
  return { error: null };
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
