"use client";

import { useRouter } from "next/navigation";
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

  return (
    <tr className="border-t border-zinc-100">
      <td className="px-4 py-2 text-zinc-900">{email}</td>
      <td className="px-4 py-2">
        <input
          type="checkbox"
          defaultChecked={canCheckin}
          onChange={async (e) => {
            await updateStaffPermissions(eventId, accountUserId, e.target.checked, canManageParticipants);
            router.refresh();
          }}
        />
      </td>
      <td className="px-4 py-2">
        <input
          type="checkbox"
          defaultChecked={canManageParticipants}
          onChange={async (e) => {
            await updateStaffPermissions(eventId, accountUserId, canCheckin, e.target.checked);
            router.refresh();
          }}
        />
      </td>
      <td className="px-4 py-2 text-right">
        <div className="flex items-center justify-end gap-3">
          <ResetPasswordButton eventId={eventId} accountUserId={accountUserId} />
          <button
            className="text-xs text-red-600 hover:underline"
            onClick={async () => {
              if (!confirm("Remove this staff member?")) return;
              await removeStaff(eventId, accountUserId);
              router.refresh();
            }}
          >
            Remove
          </button>
        </div>
      </td>
    </tr>
  );
}
