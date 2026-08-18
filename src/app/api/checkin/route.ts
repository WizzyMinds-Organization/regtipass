import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getEventContext } from "@/lib/event-context";
import { TICKET_ID_PATTERN } from "@/lib/slug";

// Read-only lookup used by the scanner before check-in is confirmed: shows
// the staff member who's about to check a guest in without mutating
// anything, so a ticket that's briefly still in the camera's view doesn't
// get re-submitted and flip the result from "checked in" to "already
// checked in" — that flip was the actual bug behind the old auto-checkin-
// on-scan flow.
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const ticketId = (searchParams.get("ticketId") ?? "").trim();
  const eventId = (searchParams.get("eventId") ?? "").trim();

  if (!ticketId || !TICKET_ID_PATTERN.test(ticketId)) {
    return NextResponse.json({ error: "Invalid ticket ID format." }, { status: 400 });
  }

  const ctx = eventId ? await getEventContext(eventId) : null;
  if (!ctx || !ctx.canCheckin) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const supabase = await createClient();
  const { data: ticket } = await supabase
    .from("tickets")
    .select("id, status, participant_data")
    .eq("id", ticketId)
    .eq("event_id", eventId)
    .maybeSingle();

  if (!ticket) {
    return NextResponse.json({ found: false });
  }

  return NextResponse.json({
    found: true,
    ticket_id: ctx.checkinOnly ? undefined : ticket.id,
    status: ticket.status,
    participant_data: ticket.participant_data,
  });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const ticketId = String(body?.ticketId ?? "").trim();
  const eventId = String(body?.eventId ?? "").trim();

  if (!ticketId || !TICKET_ID_PATTERN.test(ticketId)) {
    return NextResponse.json({ error: "Invalid ticket ID format." }, { status: 400 });
  }

  const ctx = eventId ? await getEventContext(eventId) : null;
  if (!ctx || !ctx.canCheckin) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const supabase = await createClient();
  const deviceInfo = request.headers.get("user-agent")?.slice(0, 200) ?? null;

  const { data, error } = await supabase
    .rpc("check_in_ticket", { p_ticket_id: ticketId, p_device_info: deviceInfo })
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  if (ctx.checkinOnly && data && typeof data === "object") {
    const rest = { ...(data as Record<string, unknown>) };
    delete rest.ticket_id;
    return NextResponse.json(rest);
  }

  return NextResponse.json(data);
}
