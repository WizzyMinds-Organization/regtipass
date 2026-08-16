"use client";

import { useRouter } from "next/navigation";
import { deleteTemplate } from "./actions";

export function DeleteTemplateButton({
  eventId,
  templateId,
}: {
  eventId: string;
  templateId: string;
}) {
  const router = useRouter();

  return (
    <button
      className="text-xs text-red-600 hover:underline"
      onClick={async (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!confirm("Delete this template? This cannot be undone.")) return;
        await deleteTemplate(eventId, templateId);
        router.refresh();
      }}
    >
      Delete
    </button>
  );
}
