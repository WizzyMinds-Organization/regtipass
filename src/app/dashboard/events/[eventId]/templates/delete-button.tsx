"use client";

import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { ConfirmDialog, useConfirmDialog } from "@/components/confirm-dialog";
import { useToast } from "@/components/toast";
import { deleteTemplate } from "./actions";

export function DeleteTemplateButton({
  eventId,
  templateId,
}: {
  eventId: string;
  templateId: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const dialog = useConfirmDialog();

  return (
    <>
      <button
        className="rounded-md p-1.5 text-zinc-400 hover:bg-red-50 hover:text-red-600"
        title="Delete ticket template"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          dialog.show();
        }}
      >
        <Trash2 className="h-4 w-4" />
      </button>

      <ConfirmDialog
        open={dialog.open}
        pending={dialog.pending}
        title="Delete ticket template"
        message="Delete this template? This cannot be undone."
        confirmLabel="Delete ticket template"
        onCancel={dialog.hide}
        onConfirm={async () => {
          dialog.setPending(true);
          try {
            await deleteTemplate(eventId, templateId);
            toast.success("Template deleted.");
            router.refresh();
          } catch (err) {
            toast.error(err instanceof Error ? err.message : "Failed to delete template.");
          }
          dialog.hide();
        }}
      />
    </>
  );
}
