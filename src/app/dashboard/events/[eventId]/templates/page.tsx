import { redirect } from "next/navigation";

export default async function TemplatesRedirect({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  redirect(`/dashboard/events/${eventId}/form?tab=templates`);
}
