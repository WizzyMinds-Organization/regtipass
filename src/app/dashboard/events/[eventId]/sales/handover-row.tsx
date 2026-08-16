"use client";

import { useRouter } from "next/navigation";
import type { CashHandover } from "@/lib/supabase/types";
import { deleteHandover } from "./actions";

const RECIPIENT_LABEL: Record<CashHandover["recipient_type"], string> = {
  organizer: "Organizer",
  finance: "Finance",
  vendor: "Vendor",
  other: "Other",
};

export function HandoverRow({
  eventId,
  handover,
  email,
  canDelete,
}: {
  eventId: string;
  handover: CashHandover;
  email: string;
  canDelete: boolean;
}) {
  const router = useRouter();

  return (
    <tr className="border-t border-zinc-100">
      <td className="px-5 py-2.5 text-zinc-500">
        {new Date(handover.created_at).toLocaleString()}
      </td>
      <td className="px-5 py-2.5 text-zinc-900">{email}</td>
      <td className="px-5 py-2.5 text-zinc-600">{Number(handover.amount).toFixed(2)}</td>
      <td className="px-5 py-2.5 text-zinc-600">
        {RECIPIENT_LABEL[handover.recipient_type]}
        {handover.recipient_name ? ` — ${handover.recipient_name}` : ""}
      </td>
      <td className="px-5 py-2.5 text-zinc-500">{handover.note ?? "—"}</td>
      {canDelete && (
        <td className="px-5 py-2.5 text-right">
          <button
            className="text-xs text-red-600 hover:underline"
            onClick={async () => {
              if (!confirm("Remove this handover record?")) return;
              await deleteHandover(eventId, handover.id);
              router.refresh();
            }}
          >
            Remove
          </button>
        </td>
      )}
    </tr>
  );
}
