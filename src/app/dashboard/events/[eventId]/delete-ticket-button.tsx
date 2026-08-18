"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
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
  const [deleting, setDeleting] = useState(false);

  return (
    <button
      className="text-zinc-400 hover:text-red-600 disabled:opacity-50"
      title="Delete ticket"
      disabled={deleting}
      onClick={async () => {
        if (!confirm(`Delete the ticket for "${participantName}" (${ticketId})? This cannot be undone.`)) return;
        setDeleting(true);
        await deleteTicket(eventId, ticketId);
        router.refresh();
      }}
    >
      <Trash2 className="h-4 w-4" />
    </button>
  );
}
