import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createEvent, setAccountStatus } from "@/app/admin/actions";

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
          href="/admin"
          className="mb-2 inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          All accounts
        </Link>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">{account.name}</h1>
            {account.contact_email && (
              <p className="mt-1 text-sm text-zinc-500">{account.contact_email}</p>
            )}
          </div>
          <form action={toggleStatus}>
            <button
              className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                account.status === "active"
                  ? "bg-red-50 text-red-700 hover:bg-red-100"
                  : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
              }`}
            >
              {account.status === "active" ? "Suspend account" : "Reactivate account"}
            </button>
          </form>
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-zinc-900">New event</h2>
        <form action={createEvent} className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <input type="hidden" name="account_id" value={accountId} />
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-zinc-600">Event name</label>
            <input
              name="name"
              required
              className="rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-emerald-500"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-zinc-600">Slug (optional)</label>
            <input
              name="slug"
              placeholder="auto-generated from name"
              className="rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-emerald-500"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-zinc-600">Ticket quota</label>
            <input
              name="ticket_quota"
              type="number"
              min={1}
              required
              className="rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-emerald-500"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-zinc-600">Event date (optional)</label>
            <input
              name="event_date"
              type="date"
              className="rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-emerald-500"
            />
          </div>
          <button
            type="submit"
            className="col-span-1 self-start rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 sm:col-span-2"
          >
            Create event
          </button>
        </form>
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
                        ? "bg-emerald-100 text-emerald-700"
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
