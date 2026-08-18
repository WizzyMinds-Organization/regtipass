import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getEventContext } from "@/lib/event-context";
import { getLastEventId } from "@/lib/last-event";

export default async function Home() {
  const user = await getCurrentUser();

  if (!user) redirect("/login");
  if (user.isSuperAdmin) redirect("/admin");
  if (user.memberships.length === 0) redirect("/login?error=no_access");

  const lastEventId = await getLastEventId();
  if (lastEventId) {
    const ctx = await getEventContext(lastEventId);
    if (ctx) {
      if (ctx.checkinOnly) redirect(`/dashboard/events/${lastEventId}/checkin`);
      redirect(`/dashboard/events/${lastEventId}`);
    }
  }

  redirect("/dashboard");
}
