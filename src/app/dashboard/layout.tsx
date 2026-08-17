import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ShellProvider } from "@/components/dashboard/shell-context";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.isSuperAdmin) redirect("/admin");
  if (user.memberships.length === 0) redirect("/login?error=no_access");

  const supabase = await createClient();
  const { data: events } = await supabase
    .from("events")
    .select("id, name, status")
    .order("created_at", { ascending: false });

  return (
    <ShellProvider>
      <DashboardShell userEmail={user.email} events={events ?? []}>
        {children}
      </DashboardShell>
    </ShellProvider>
  );
}
