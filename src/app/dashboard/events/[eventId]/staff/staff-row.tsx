"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { ConfirmDialog, useConfirmDialog } from "@/components/confirm-dialog";
import { useToast } from "@/components/toast";
import type { StaffRole } from "@/lib/supabase/types";
import { removeStaff, updateStaffRole } from "./actions";
import { ROLE_LABELS } from "./roles";
import { ResetPasswordButton } from "./reset-password-button";

const ROLE_ORDER: StaffRole[] = ["manager", "issuer", "checkin"];

export function StaffRow({
  eventId,
  accountUserId,
  name,
  email,
  role,
}: {
  eventId: string;
  accountUserId: string;
  name: string;
  email: string;
  role: StaffRole;
}) {
  const router = useRouter();
  const toast = useToast();
  const dialog = useConfirmDialog();
  const [saving, setSaving] = useState(false);

  return (
    <tr className="border-t border-zinc-100">
      <td className="px-4 py-2 text-zinc-900">{name}</td>
      <td className="px-4 py-2 text-zinc-600">{email}</td>
      <td className="px-4 py-2">
        <select
          defaultValue={role}
          disabled={saving}
          onChange={async (e) => {
            setSaving(true);
            await updateStaffRole(eventId, accountUserId, e.target.value as StaffRole);
            toast.success("Role updated.");
            router.refresh();
            setSaving(false);
          }}
          className="rounded-md border border-zinc-300 px-2 py-1 text-sm text-zinc-700 disabled:opacity-50"
        >
          {ROLE_ORDER.map((r) => (
            <option key={r} value={r}>
              {ROLE_LABELS[r]}
            </option>
          ))}
        </select>
      </td>
      <td className="px-4 py-2 text-right">
        <div className="flex items-center justify-end gap-3">
          <ResetPasswordButton eventId={eventId} accountUserId={accountUserId} email={email} />
          <button
            className="rounded-md p-1.5 text-zinc-400 hover:bg-red-50 hover:text-red-600"
            title="Remove staff member"
            onClick={dialog.show}
          >
            <Trash2 className="h-4 w-4" />
          </button>

          <ConfirmDialog
            open={dialog.open}
            pending={dialog.pending}
            title="Remove staff member"
            message={`Remove ${email} from this event's staff?`}
            confirmLabel="Remove"
            onCancel={dialog.hide}
            onConfirm={async () => {
              dialog.setPending(true);
              try {
                await removeStaff(eventId, accountUserId);
                toast.success("Staff member removed.");
                router.refresh();
              } catch (err) {
                toast.error(err instanceof Error ? err.message : "Failed to remove staff member.");
              }
              dialog.hide();
            }}
          />
        </div>
      </td>
    </tr>
  );
}
