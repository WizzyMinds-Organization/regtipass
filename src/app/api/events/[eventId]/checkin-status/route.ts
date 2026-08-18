import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getEventContext } from "@/lib/event-context";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const { eventId } = await params;
  const ctx = await getEventContext(eventId);
  if (!ctx || !ctx.canCheckin) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const supabase = await createClient();
  const [{ data: fields }, { data: tickets }] = await Promise.all([
    supabase.from("form_fields").select("key, label").eq("event_id", eventId).order("sort_order"),
    supabase
      .from("tickets")
      .select("id, participant_data, status")
      .eq("event_id", eventId)
      .order("created_at", { ascending: false }),
  ]);

  const allFields = fields ?? [];
  const nameField = allFields.find((f) => /name/i.test(f.key) || /name/i.test(f.label)) ?? allFields[0] ?? null;

  const guests = (tickets ?? []).map((t) => {
    const data = (t.participant_data as Record<string, string> | null) ?? {};
    return {
      id: ctx.checkinOnly ? undefined : t.id,
      name: (nameField && data[nameField.key]) || "—",
      status: t.status as "issued" | "checked_in",
    };
  });

  const checkedIn = guests.filter((g) => g.status === "checked_in").length;

  return NextResponse.json({ issued: guests.length, checkedIn, guests });
}
