"use client";

import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { ConfirmDialog, useConfirmDialog } from "@/components/confirm-dialog";
import { useToast } from "@/components/toast";
import { deleteTicket } from "./issue/actions";

export function DeleteTicketButton({
  eventId,
  ticketId,
  participantName,
}: {
  eventId: string;
  ticketId: string;
  participantName: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const dialog = useConfirmDialog();

  return (
    <>
      <button
        className="rounded-md p-1.5 text-zinc-400 hover:bg-red-50 hover:text-red-600"
        title="Delete ticket"
        onClick={dialog.show}
      >
        <Trash2 className="h-4 w-4" />
      </button>

      <ConfirmDialog
        open={dialog.open}
        pending={dialog.pending}
        title="Delete ticket"
        message={`Delete the ticket for "${participantName}" (${ticketId})? This cannot be undone.`}
        confirmLabel="Delete ticket"
        onCancel={dialog.hide}
        onConfirm={async () => {
          dialog.setPending(true);
          const res = await deleteTicket(eventId, ticketId);
          dialog.hide();
          if (res.error) {
            toast.error(res.error);
            return;
          }
          toast.success("Ticket deleted.");
          router.refresh();
        }}
      />
    </>
  );
}
