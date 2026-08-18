"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/auth";

export async function updateOwnName(name: string): Promise<{ error: string | null }> {
  const user = await getCurrentUser();
  if (!user) return { error: "Not authorized." };

  const trimmed = name.trim();
  if (!trimmed) return { error: "Name is required." };

  const admin = createAdminClient();
  const { error } = await admin.from("account_users").update({ name: trimmed }).eq("user_id", user.id);
  if (error) return { error: error.message };

  revalidatePath("/dashboard");
  return { error: null };
}
