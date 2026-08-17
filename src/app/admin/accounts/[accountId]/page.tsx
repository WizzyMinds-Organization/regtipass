import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { setAccountStatus } from "@/app/admin/actions";
import { NewEventModal } from "./new-event-modal";
import { ResetOwnerPasswordButton } from "./reset-owner-password-button";

export default async function AccountDetail({
  params,
}: {
  params: Promise<{ accountId: string }>;
}) {
  const { accountId } = await params;
  const supabase = await createClient();

  const [{ data: account }, { data: events }] = await Promise.all([
    supabase.from("accounts").select("*").eq("id", accountId).maybeSingle(),
    supabase
      .from("events")
      .select("*")
      .eq("account_id", accountId)
      .order("created_at", { ascending: false }),
  ]);

  if (!account) notFound();

  const toggleStatus = async () => {
    "use server";
    await setAccountStatus(accountId, account.status === "active" ? "suspended" : "active");
  };

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8">
      <div>
        <Link
          href="/admin/organizations"
          className="mb-2 inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          All organizations
        </Link>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">{account.name}</h1>
            {account.contact_email && (
              <p className="mt-1 text-sm text-zinc-500">{account.contact_email}</p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <NewEventModal accountId={accountId} />
            <ResetOwnerPasswordButton accountId={accountId} />
            <form action={toggleStatus}>
              <button
                className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                  account.status === "active"
                    ? "bg-red-50 text-red-700 hover:bg-red-100"
                    : "bg-orange-50 text-orange-700 hover:bg-orange-100"
                }`}
              >
                {account.status === "active" ? "Suspend account" : "Reactivate account"}
              </button>
            </form>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
        <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] text-sm">
          <thead className="bg-zinc-50 text-left text-zinc-500">
            <tr>
              <th className="px-4 py-2 font-medium">Event</th>
              <th className="px-4 py-2 font-medium">Slug</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2 font-medium">Quota</th>
            </tr>
          </thead>
          <tbody>
            {(events ?? []).map((e) => (
              <tr key={e.id} className="border-t border-zinc-100 hover:bg-zinc-50">
                <td className="px-4 py-3">
                  <Link href={`/admin/events/${e.id}`} className="font-medium text-zinc-900 hover:underline">
                    {e.name}
                  </Link>
                </td>
                <td className="px-4 py-3 font-mono text-xs text-zinc-500">{e.slug}</td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      e.status === "active"
                        ? "bg-orange-100 text-orange-700"
                        : "bg-zinc-200 text-zinc-600"
                    }`}
                  >
                    {e.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-zinc-600">{e.ticket_quota}</td>
              </tr>
            ))}
            {(events ?? []).length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-zinc-400">
                  No events yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}
