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
  const { data: fields } = await supabase
    .from("form_fields")
    .select("key, label")
    .eq("event_id", eventId)
    .order("sort_order");

  const allFields = fields ?? [];
  const nameField = allFields.find((f) => /name/i.test(f.key) || /name/i.test(f.label)) ?? allFields[0] ?? null;

  // Pull only the one participant_data field the guest list actually shows,
  // instead of the whole jsonb blob for every ticket on every 5s poll.
  const selectClause = nameField ? `id, status, name:participant_data->>${nameField.key}` : "id, status";
  const { data: tickets } = await supabase
    .from("tickets")
    .select<string, { id: string; status: string; name: string | null }>(selectClause)
    .eq("event_id", eventId)
    .order("created_at", { ascending: false });

  const guests = (tickets ?? []).map((t) => ({
    id: ctx.checkinOnly ? undefined : t.id,
    name: t.name || "—",
    status: t.status as "issued" | "checked_in",
  }));

  const checkedIn = guests.filter((g) => g.status === "checked_in").length;

  return NextResponse.json({ issued: guests.length, checkedIn, guests });
}
