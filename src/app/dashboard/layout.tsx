import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { ShellProvider } from "@/components/dashboard/shell-context";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.isSuperAdmin) redirect("/admin");
  if (user.memberships.length === 0) redirect("/login?error=no_access");

  return (
    <ShellProvider>
      <DashboardShell userEmail={user.email}>{children}</DashboardShell>
    </ShellProvider>
  );
}
