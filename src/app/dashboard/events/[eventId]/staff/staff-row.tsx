"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { removeStaff, updateStaffPermissions } from "./actions";
import { ResetPasswordButton } from "./reset-password-button";

export function StaffRow({
  eventId,
  accountUserId,
  email,
  canCheckin,
  canManageParticipants,
}: {
  eventId: string;
  accountUserId: string;
  email: string;
  canCheckin: boolean;
  canManageParticipants: boolean;
}) {
  const router = useRouter();
  const [savingPerms, setSavingPerms] = useState(false);
  const [removing, setRemoving] = useState(false);

  return (
    <tr className="border-t border-zinc-100">
      <td className="px-4 py-2 text-zinc-900">{email}</td>
      <td className="px-4 py-2">
        <input
          type="checkbox"
          defaultChecked={canCheckin}
          disabled={savingPerms}
          onChange={async (e) => {
            setSavingPerms(true);
            await updateStaffPermissions(eventId, accountUserId, e.target.checked, canManageParticipants);
            router.refresh();
            setSavingPerms(false);
          }}
        />
      </td>
      <td className="px-4 py-2">
        <input
          type="checkbox"
          defaultChecked={canManageParticipants}
          disabled={savingPerms}
          onChange={async (e) => {
            setSavingPerms(true);
            await updateStaffPermissions(eventId, accountUserId, canCheckin, e.target.checked);
            router.refresh();
            setSavingPerms(false);
          }}
        />
      </td>
      <td className="px-4 py-2 text-right">
        <div className="flex items-center justify-end gap-3">
          <ResetPasswordButton eventId={eventId} accountUserId={accountUserId} email={email} />
          <button
            className="text-zinc-500 hover:text-red-600 disabled:opacity-50"
            title="Remove staff member"
            disabled={removing}
            onClick={async () => {
              if (!confirm("Remove this staff member?")) return;
              setRemoving(true);
              await removeStaff(eventId, accountUserId);
              router.refresh();
            }}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </td>
    </tr>
  );
}
