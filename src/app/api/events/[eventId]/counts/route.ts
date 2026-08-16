import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getEventContext } from "@/lib/event-context";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const { eventId } = await params;
  const ctx = await getEventContext(eventId);
  if (!ctx) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const supabase = await createClient();
  const [{ count: issued }, { count: checkedIn }] = await Promise.all([
    supabase.from("tickets").select("id", { count: "exact", head: true }).eq("event_id", eventId),
    supabase
      .from("tickets")
      .select("id", { count: "exact", head: true })
      .eq("event_id", eventId)
      .eq("status", "checked_in"),
  ]);

  return NextResponse.json({ issued: issued ?? 0, checkedIn: checkedIn ?? 0 });
}
