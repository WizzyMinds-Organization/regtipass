import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getCurrentUser } from "@/lib/auth";
import { getEventContext } from "@/lib/event-context";

export default async function Home() {
  const user = await getCurrentUser();

  if (!user) redirect("/login");
  if (user.isSuperAdmin) redirect("/admin");
  if (user.memberships.length === 0) redirect("/login?error=no_access");

  const lastEventId = (await cookies()).get("last_event_id")?.value;
  if (lastEventId) {
    const ctx = await getEventContext(lastEventId);
    if (ctx) redirect(`/dashboard/events/${lastEventId}`);
  }

  redirect("/dashboard");
}
