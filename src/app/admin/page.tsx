import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { NewAccountForm } from "./new-account-form";

export default async function AdminHome() {
  const supabase = await createClient();
  const { data: accounts } = await supabase
    .from("accounts")
    .select("*")
    .order("created_at", { ascending: false });

  const { data: eventCounts } = await supabase.from("events").select("account_id, status");

  const counts = new Map<string, { total: number; active: number }>();
  for (const e of eventCounts ?? []) {
    const c = counts.get(e.account_id) ?? { total: 0, active: 0 };
    c.total += 1;
    if (e.status === "active") c.active += 1;
    counts.set(e.account_id, c);
  }

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Organizer accounts</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Create accounts, set event quotas, and manage the platform.
        </p>
      </div>

      <NewAccountForm />

      <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-left text-zinc-500">
            <tr>
              <th className="px-4 py-2 font-medium">Name</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2 font-medium">Events</th>
              <th className="px-4 py-2 font-medium">Created</th>
            </tr>
          </thead>
          <tbody>
            {(accounts ?? []).map((a) => (
              <tr key={a.id} className="border-t border-zinc-100 hover:bg-zinc-50">
                <td className="px-4 py-3">
                  <Link href={`/admin/accounts/${a.id}`} className="font-medium text-zinc-900 hover:underline">
                    {a.name}
                  </Link>
                  {a.contact_email && (
                    <div className="text-xs text-zinc-500">{a.contact_email}</div>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      a.status === "active"
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {a.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-zinc-600">
                  {counts.get(a.id)?.active ?? 0} active / {counts.get(a.id)?.total ?? 0} total
                </td>
                <td className="px-4 py-3 text-zinc-500">
                  {new Date(a.created_at).toLocaleDateString()}
                </td>
              </tr>
            ))}
            {(accounts ?? []).length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-zinc-400">
                  No accounts yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
