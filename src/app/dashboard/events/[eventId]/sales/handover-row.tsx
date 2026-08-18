"use client";

import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import type { CashHandover } from "@/lib/supabase/types";
import { ConfirmDialog, useConfirmDialog } from "@/components/confirm-dialog";
import { useToast } from "@/components/toast";
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
  const toast = useToast();
  const dialog = useConfirmDialog();

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
            className="rounded-md p-1.5 text-zinc-400 hover:bg-red-50 hover:text-red-600"
            title="Remove handover"
            onClick={dialog.show}
          >
            <Trash2 className="h-4 w-4" />
          </button>

          <ConfirmDialog
            open={dialog.open}
            pending={dialog.pending}
            title="Remove handover"
            message="Remove this handover record? This cannot be undone."
            confirmLabel="Remove"
            onCancel={dialog.hide}
            onConfirm={async () => {
              dialog.setPending(true);
              try {
                await deleteHandover(eventId, handover.id);
                toast.success("Handover removed.");
                router.refresh();
              } catch (err) {
                toast.error(err instanceof Error ? err.message : "Failed to remove handover.");
              }
              dialog.hide();
            }}
          />
        </td>
      )}
    </tr>
  );
}
