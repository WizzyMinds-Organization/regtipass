import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { AccountUser } from "@/lib/supabase/types";

export interface CurrentUser {
  id: string;
  email: string | null;
  isSuperAdmin: boolean;
  memberships: AccountUser[];
}

export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const [{ data: superAdminRow }, { data: memberships }] = await Promise.all([
    supabase.from("super_admins").select("user_id").eq("user_id", user.id).maybeSingle(),
    supabase.from("account_users").select("*").eq("user_id", user.id),
  ]);

  return {
    id: user.id,
    email: user.email ?? null,
    isSuperAdmin: !!superAdminRow,
    memberships: memberships ?? [],
  };
});
