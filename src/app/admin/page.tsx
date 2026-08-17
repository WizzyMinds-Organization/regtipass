import { Building2, CalendarRange, CheckCircle2, ShieldAlert } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/dashboard/page-header";
import { StatCard } from "@/components/dashboard/stat-card";

export default async function AdminHome() {
  const supabase = await createClient();
  const { data: accounts } = await supabase.from("accounts").select("status");
  const { data: eventCounts } = await supabase.from("events").select("status");

  const totalAccounts = accounts?.length ?? 0;
  const suspended = (accounts ?? []).filter((a) => a.status === "suspended").length;
  const totalEvents = eventCounts?.length ?? 0;
  const activeEvents = (eventCounts ?? []).filter((e) => e.status === "active").length;

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8">
      <PageHeader
        title="Overview"
        subtitle="Platform-wide stats across all organizations."
      />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard icon={Building2} label="Accounts" value={totalAccounts} color="zinc" />
        <StatCard icon={ShieldAlert} label="Suspended" value={suspended} color="amber" />
        <StatCard icon={CalendarRange} label="Total events" value={totalEvents} color="blue" />
        <StatCard icon={CheckCircle2} label="Active events" value={activeEvents} color="orange" />
      </div>
    </div>
  );
}
